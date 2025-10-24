import { CheckCircle, XCircle, AlertTriangle, Download } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { format } from "date-fns";
import { ScanReport } from "@/types/scan";
import { downloadReport } from "@/utils/downloadReport";

interface Props {
  data: ScanReport;
}

const Results = ({ data }: Props) => {
  const { headers, tls, exposed, cookies, url, securityScore } = data;

  const headerIssues = Object.values(headers).filter((v) => !v).length;
  const cookieIssues = cookies.filter(
    (c) => !c.httpOnly || !c.secure || c.sameSite === "None"
  ).length;

  const summary = [
    {
      label: "Security Score",
      value: securityScore ?? 0,
      suffix: "/100",
      color:
        (securityScore ?? 0) >= 80
          ? "text-success"
          : (securityScore ?? 0) >= 60
          ? "text-yellow-500"
          : "text-error",
    },
    {
      label: "Header Issues",
      value: headerIssues,
      color: headerIssues === 0 ? "text-success" : "text-error",
    },
    {
      label: "Cookie Issues",
      value: cookieIssues,
      color: cookieIssues === 0 ? "text-success" : "text-yellow-500",
    },
    {
      label: "Exposed Issues",
      value: exposed.directoryListing ? 1 : 0,
      color: exposed.directoryListing ? "text-error" : "text-success",
    },
  ];

  return (
    <section id="results" className="bg-section mt-16 rounded-lg">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Security Analysis Results
        </h1>
        <p className="text-lg text-muted-foreground">
          Detailed breakdown for <span className="text-primary">{url}</span>
        </p>
        {exposed.finalUrl && exposed.finalUrl !== url && (
          <p className="text-sm text-muted-foreground mt-2">
            Redirected to: {exposed.finalUrl}
          </p>
        )}
      </div>

      <div className="flex justify-end mb-6">
        <Button
          onClick={() => downloadReport(data)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Download Report
        </Button>
      </div>

      <Card className="p-6 mb-8 bg-card border-border">
        <div className="flex flex-wrap gap-8 justify-center items-center">
          {summary.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              {item.label === "Security Score" ? (
                <CheckCircle className="w-8 h-8 text-success" />
              ) : item.value === 0 ? (
                <CheckCircle className="w-8 h-8 text-success" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-error" />
              )}
              <div>
                <div className={`text-3xl font-bold ${item.color}`}>
                  {item.value}
                  {item.suffix || ""}
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {exposed.redirectedToHttps && (
        <Card className="p-4 mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Good! Site automatically redirects HTTP to HTTPS
            </p>
          </div>
        </Card>
      )}

      {exposed.directoryListing && (
        <Card className="p-4 mb-6 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-800 dark:text-red-200">
              Warning! Directory listing is enabled. This exposes your file
              structure.
            </p>
          </div>
        </Card>
      )}

      <h3 className="text-2xl font-bold text-foreground mb-4">
        Security Headers
      </h3>
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {Object.entries(headers).map(([key, value]) => (
          <Card
            key={key}
            className={`p-6 bg-card border-border border-l-4 ${
              value ? "border-l-success" : "border-l-error"
            }`}
          >
            <div className="flex items-start gap-4">
              {value ? (
                <CheckCircle className="w-6 h-6 text-success shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-error shrink-0" />
              )}
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-1">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {value
                    ? "Configured properly"
                    : "Missing or weak configuration"}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-6 bg-card border-border">
        <h3 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
          {tls.valid ? (
            <CheckCircle className="w-6 h-6 text-success" />
          ) : (
            <XCircle className="w-6 h-6 text-error" />
          )}
          TLS Certificate
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>Status:</strong> {tls.valid ? "✅ Valid" : "❌ Invalid"}
          </li>
          {tls.error && (
            <li>
              <strong>Error:</strong> {tls.error}
            </li>
          )}
          {tls.issuer && (
            <li>
              <strong>Issuer:</strong> {tls.issuer}
            </li>
          )}
          {tls.daysRemaining !== undefined && (
            <li>
              <strong>Expires In:</strong>{" "}
              <span
                className={
                  tls.daysRemaining < 30
                    ? "text-error font-semibold"
                    : "text-success"
                }
              >
                {tls.daysRemaining} days
              </span>
              {tls.daysRemaining < 30 && " ⚠️ Renew soon!"}
            </li>
          )}
          {tls.validFrom && (
            <li>
              <strong>Valid From:</strong>{" "}
              {format(new Date(tls.validFrom), "PPP")}
            </li>
          )}

          {tls.validTo && (
            <li>
              <strong>Valid To:</strong> {format(new Date(tls.validTo), "PPP")}
            </li>
          )}
        </ul>
      </Card>

      {cookies.length > 0 && (
        <Card className="mt-8 p-6 bg-card border-border">
          <h3 className="text-xl font-semibold mb-4 text-foreground">
            Cookies ({cookies.length})
          </h3>
          <div className="space-y-3">
            {cookies.map((cookie, i) => (
              <div
                key={i}
                className="p-3 bg-background rounded border border-border"
              >
                <div className="font-medium text-foreground mb-2">
                  {cookie.name}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span
                    className={`px-2 py-1 rounded ${
                      cookie.httpOnly
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                    }`}
                  >
                    {cookie.httpOnly ? "✓" : "✗"} HttpOnly
                  </span>
                  <span
                    className={`px-2 py-1 rounded ${
                      cookie.secure
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                    }`}
                  >
                    {cookie.secure ? "✓" : "✗"} Secure
                  </span>
                  <span
                    className={`px-2 py-1 rounded ${
                      cookie.sameSite !== "None"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                    }`}
                  >
                    SameSite: {cookie.sameSite}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="mt-8 p-6 bg-card border-border">
        <h3 className="text-xl font-semibold mb-4 text-foreground">
          Exposed Information
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>Server Header:</strong> {exposed.serverHeader}
            {exposed.serverHeader !== "Not disclosed" && (
              <span className="text-yellow-600 dark:text-yellow-400 ml-2">
                ⚠️ Consider hiding
              </span>
            )}
          </li>
          <li>
            <strong>Robots.txt:</strong>{" "}
            {exposed.robotsTxt.length > 0 ? (
              <span className="text-primary">
                {exposed.robotsTxt.length} directives found
              </span>
            ) : (
              "None"
            )}
          </li>
          <li>
            <strong>Sitemap Found:</strong>{" "}
            {exposed.sitemapExists ? (
              <span className="text-success">✅ Yes</span>
            ) : (
              <span className="text-muted-foreground">❌ No</span>
            )}
          </li>
          <li>
            <strong>Directory Listing:</strong>{" "}
            {exposed.directoryListing ? (
              <span className="text-error font-semibold">
                ⚠️ Enabled (Risk!)
              </span>
            ) : (
              <span className="text-success">✅ Disabled</span>
            )}
          </li>
        </ul>
      </Card>

      <Card className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700">
        <h3 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          Recommendations
        </h3>
        <ul className="space-y-2 text-sm text-foreground list-disc list-inside">
          {headerIssues > 0 && (
            <li>
              Configure missing security headers to protect against common web
              vulnerabilities
            </li>
          )}
          {!tls.valid && (
            <li className="text-error font-semibold">
              Enable HTTPS with a valid SSL/TLS certificate immediately
            </li>
          )}
          {tls.daysRemaining && tls.daysRemaining < 30 && (
            <li className="text-error">
              Renew your SSL certificate soon (expires in {tls.daysRemaining}{" "}
              days)
            </li>
          )}
          {cookieIssues > 0 && (
            <li>
              Add HttpOnly, Secure, and SameSite flags to cookies to prevent XSS
              and CSRF attacks
            </li>
          )}
          {exposed.directoryListing && (
            <li className="text-error font-semibold">
              Disable directory listing to prevent exposure of file structure
            </li>
          )}
          {exposed.serverHeader !== "Not disclosed" && (
            <li>Hide server version information to reduce attack surface</li>
          )}
          {(securityScore ?? 0) < 80 && (
            <li>
              Review and implement the security best practices to improve your
              security score
            </li>
          )}
        </ul>
      </Card>
    </section>
  );
};

export default Results;
