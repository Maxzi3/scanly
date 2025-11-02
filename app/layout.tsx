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
 
  metadataBase: new URL("https://scanly-devmaxzi.vercel.app"),

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
    url: "https://scanly-devmaxzi.vercel.app/",
    type: "website",
    siteName: "Scanly",
    locale: "en_US",
    images: [
      {
        url: "https://scanly-devmaxzi.vercel.app/og-logo.png",
        width: 1200,
        height: 630,
        alt: "Scanly Security Scanner",
        type: "image/png", 
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Scanly | Website Security Scanner",
    description:
      "Scan your website for security vulnerabilities with Scanly. Fast, free, and secure.",
    images: ["https://scanly-devmaxzi.vercel.app/og-logo.png"],
  },

  robots: {
    index: true,
    follow: true,
  },

  alternates: {
    canonical: "https://scanly-devmaxzi.vercel.app/",
  },


  other: {
    "og:image:secure_url": "https://scanly-devmaxzi.vercel.app/og-logo.png",
    "og:image:type": "image/png",
    "og:image:width": "1200",
    "og:image:height": "630",
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
      <head>
        <meta
          property="og:image:secure_url"
          content="https://scanly-devmaxzi.vercel.app/og-logo.png"
        />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
      </head>
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
