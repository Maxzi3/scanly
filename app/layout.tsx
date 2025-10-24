import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-nunito-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Scanly | Website Security Scanner",
  description:
    "Scanly: Analyze your website's security in seconds. Check headers, SSL/TLS, cookies, and more to protect against vulnerabilities.",
  keywords: [
    "website security",
    "security scanner",
    "SSL checker",
    "HTTP headers",
    "cookie security",
    "cybersecurity",
    "web vulnerabilities",
  ],
  openGraph: {
    title: "Scanly | Website Security Scanner",
    description:
      "Instantly scan your website for security issues with Scanly. Analyze headers, SSL, and cookies to stay secure.",
    url: "https://scanly-devmaxzi.vercel.app/", // Replace with your actual domain
    type: "website",
    images: [
      {
        url: "/og-logo.png", // Replace with your actual domain
        width: 1200,
        height: 630,
        alt: "Scanly Security Scanner",
      },
    ],
    siteName: "Scanly",
  },
  twitter: {
    card: "summary_large_image",
    title: "Scanly | Website Security Scanner",
    description:
      "Scan your website for security vulnerabilities with Scanly. Fast, free, and secure.",
    images: ["/og-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://scanly-devmaxzi.vercel.app/",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${nunitoSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <Navbar />
          <Toaster />
          {children}
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
