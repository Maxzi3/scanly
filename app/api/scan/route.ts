import { NextResponse } from "next/server";
import sslChecker from "ssl-checker";
import { parse as parseCookie } from "cookie";
import type { ScanRequest, ScanReport, SSLCheckerResult } from "@/types/scan";

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// Helper to add timeout to fetch
async function fetchWithTimeout(url: string, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "SecurityScanner/1.0",
      },
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// Calculate security score
function calculateSecurityScore(
  report: Omit<ScanReport, "securityScore">
): number {
  let score = 0;
  const weights = {
    headers: 40,
    tls: 30,
    cookies: 20,
    exposed: 10,
  };

  // Headers (40 points)
  const headerCount = Object.values(report.headers).filter(Boolean).length;
  const totalHeaders = Object.keys(report.headers).length;
  score += (headerCount / totalHeaders) * weights.headers;

  // TLS (30 points)
  if (report.tls.valid) {
    score += weights.tls;
    if (report.tls.daysRemaining && report.tls.daysRemaining < 30) {
      score -= 5; // Deduct for expiring soon
    }
  }

  // Cookies (20 points)
  if (report.cookies.length > 0) {
    const secureCookies = report.cookies.filter(
      (c) => c.httpOnly && c.secure && c.sameSite !== "None"
    ).length;
    score += (secureCookies / report.cookies.length) * weights.cookies;
  } else {
    score += weights.cookies; // No cookies is fine
  }

  // Exposed info (10 points)
  if (!report.exposed.directoryListing) score += 5;
  if (report.exposed.serverHeader === "Not disclosed") score += 5;

  return Math.round(score);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: Request) {
  try {
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const { url }: ScanRequest = await req.json();

    if (!url || !/^https?:\/\//.test(url)) {
      return NextResponse.json(
        { error: "Invalid URL. Must start with http:// or https://" },
        { status: 400 }
      );
    }

    // Parse URL properly
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Malformed URL" }, { status: 400 });
    }

    const isHttps = parsedUrl.protocol === "https:";
    const hostname = parsedUrl.hostname;

    // 1️⃣ Fetch main page
    let response: Response;
    let redirectedToHttps = false;

    try {
      response = await fetchWithTimeout(url);

      // Check if redirected to HTTPS
      if (!isHttps && response.url.startsWith("https://")) {
        redirectedToHttps = true;
      }
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error && err.name === "AbortError"
              ? "Request timed out. The website might be slow or unreachable."
              : "Failed to fetch website. Please check the URL and try again.",
        },
        { status: 500 }
      );
    }

    const headers = response.headers;
    const html = await response.text();

    // 2️⃣ Security Headers
    const headerChecks: ScanReport["headers"] = {
      csp: headers.has("content-security-policy"),
      xFrameOptions: headers.has("x-frame-options"),
      xContentTypeOptions: headers.has("x-content-type-options"),
      hsts: headers.has("strict-transport-security"),
      referrerPolicy: headers.has("referrer-policy"),
      permissionsPolicy: headers.has("permissions-policy"),
      xXssProtection: headers.has("x-xss-protection"),
      crossOriginEmbedderPolicy: headers.has("cross-origin-embedder-policy"),
      crossOriginOpenerPolicy: headers.has("cross-origin-opener-policy"),
      crossOriginResourcePolicy: headers.has("cross-origin-resource-policy"),
    };

    // 3️⃣ Server Info
    const serverHeader = headers.get("server") || "Not disclosed";

    // 4️⃣ Cookie Info - FIXED to get all cookies
    const cookies: ScanReport["cookies"] = [];

    // Try getSetCookie if available (newer Node versions)
    let cookieHeaders: string[] = [];
    if (typeof headers.getSetCookie === "function") {
      cookieHeaders = headers.getSetCookie();
    } else {
      // Fallback: manually iterate
      headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") {
          cookieHeaders.push(value);
        }
      });
    }

    for (const raw of cookieHeaders) {
      try {
        const cookieParts = raw.split(";");
        const parsed = parseCookie(cookieParts[0]);
        const name = Object.keys(parsed)[0];

        if (name) {
          const rawLower = raw.toLowerCase();
          cookies.push({
            name,
            httpOnly: rawLower.includes("httponly"),
            secure: rawLower.includes("secure"),
            sameSite: /samesite=(lax|strict|none)/i.exec(raw)?.[1] || "None",
          });
        }
      } catch {
        // Skip malformed cookies
        continue;
      }
    }

    // 5️⃣ robots.txt and sitemap.xml
    const robotsUrl = new URL("/robots.txt", url).href;
    const sitemapUrl = new URL("/sitemap.xml", url).href;

    const [robotsRes, sitemapRes] = await Promise.allSettled([
      fetchWithTimeout(robotsUrl, 5000).then((r) => (r.ok ? r.text() : "")),
      fetchWithTimeout(sitemapUrl, 5000).then((r) => r.ok),
    ]);

    const robotsTxt =
      robotsRes.status === "fulfilled" && robotsRes.value
        ? robotsRes.value
            .split("\n")
            .filter((line) => line.trim() && !line.startsWith("#"))
            .slice(0, 20) // Limit output
        : [];

    const sitemapExists =
      sitemapRes.status === "fulfilled" && sitemapRes.value === true;

    // 6️⃣ Directory listing detection - IMPROVED
    const directoryListing =
      /<title>Index of/i.test(html) ||
      /<h1>Index of/i.test(html) ||
      /Directory Listing/i.test(html);

    // 7️⃣ TLS Info - FIXED hostname extraction
    let tlsInfo: ScanReport["tls"];

    if (!isHttps) {
      tlsInfo = {
        valid: false,
        error: "Not using HTTPS",
      };
    } else {
      try {
        const ssl = (await sslChecker(hostname)) as SSLCheckerResult;
        tlsInfo = {
          valid: ssl.valid,
          daysRemaining: ssl.daysRemaining,
          validFrom: ssl.validFrom,
          validTo: ssl.validTo,
          issuer: ssl.issuer,
        };
      } catch (err) {
        tlsInfo = {
          valid: false,
          error:
            err instanceof Error ? err.message : "TLS certificate check failed",
        };
      }
    }

    // ✅ Combine results
    const report: Omit<ScanReport, "securityScore"> = {
      url,
      headers: headerChecks,
      tls: tlsInfo,
      exposed: {
        serverHeader,
        robotsTxt,
        sitemapExists,
        directoryListing,
        redirectedToHttps,
        finalUrl: response.url !== url ? response.url : undefined,
      },
      cookies,
    };

    const finalReport: ScanReport = {
      ...report,
      securityScore: calculateSecurityScore(report),
    };

    return NextResponse.json(finalReport, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to scan site. Please try again.",
      },
      { status: 500 }
    );
  }
}
