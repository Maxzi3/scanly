## Scanly v1 - Website Security Scanner
Scanly is a fast, free, and user-friendly tool to analyze website security. It checks HTTP headers, SSL/TLS configurations, cookies, and exposed information to identify vulnerabilities and provide actionable recommendations.
Features

Security Scanning: Analyze website headers, SSL/TLS, cookies, and exposed information in seconds.
User-Friendly Interface: Clean UI with a hero section for quick scans and detailed results display.
PDF Reports: Download comprehensive security reports in PDF format using jsPDF.
SEO Optimized: Configured with metadata for search engines and social media sharing.
Responsive Design: Built with Tailwind CSS and Nunito Sans font for a polished, mobile-friendly experience.
Next.js Powered: Leverages server-side rendering and client components for performance and interactivity.
Theme Support: Light/dark mode toggle with next-themes.

## Tech Stack

Framework: Next.js 16 (App Router)
Styling: Tailwind CSS
Fonts: Nunito Sans (via next/font/google)
Components: Custom UI components (ui/button, ui/card, etc.)
Icons: Lucide React
Libraries: sonner (toasts), jsPDF (PDF reports), next-themes (theme switching)
TypeScript: Type-safe with ScanReport interface

## Installation

Clone the Repository:
git clone https://github.com/yourusername/scanly.git
cd scanly


Install Dependencies:
npm install


Set Up Environment:Create a .env.local file in the root directory and add any necessary environment variables (e.g., API endpoints if applicable):
# Example
NEXT_PUBLIC_API_URL=https://api.yourwebsite.com


Run the Development Server:
npm run dev

Open http://localhost:3000 in your browser.

Build for Production:
npm run build
npm run start



## Usage

Homepage:

Enter a website URL (e.g., https://example.com) in the Hero section.
Click "Scan Now" to navigate to the Scanner section and initiate the scan.
Alternatively, use the Scanner section directly to input a URL and run a scan.


## Results:

View a detailed breakdown of security headers, SSL/TLS, cookies, and exposed information.
Check the security score and recommendations for improving your website’s security.


## Download Report:

Click the "Download Report" button in the Results section to generate a PDF report with scan details.



## Project Structure
scanly/
├── app/
│   ├── not-found.tsx        # Custom 404 page
│   ├── globals.css          # Global styles with Tailwind CSS
│   ├── layout.tsx           # Root layout with metadata and theme
│   ├── page.tsx             # Homepage with Hero, Features, Scanner
├── components/
│   ├── Hero.tsx             # URL input and scan trigger
│   ├── Scanner.tsx          # Handles API calls and results display
│   ├── Results.tsx          # Renders scan results and recommendations
│   ├── Navbar.tsx           # Navigation with theme toggle
│   ├── Footer.tsx           # Footer component
│   ├── Logo.tsx             # Logo component
│   ├── ui/                  # Reusable UI components (Button, Card, etc.)
├── utils/
│   ├── downloadReport.ts    # PDF report generation with jsPDF
├── types/
│   ├── scan.ts              # ScanReport TypeScript interface
├── public/
│   ├── og-logo.png          # OpenGraph/Twitter image

## API Integration
The Scanner component makes a POST request to /api/scan with the URL to analyze. Ensure your backend API is set up to handle this request and return a ScanReport object with the following structure:
interface ScanReport {
  url: string;
  securityScore: number;
  headers: Record<string, boolean>;
  tls: {
    valid: boolean;
    issuer?: string;
    validFrom?: string;
    validTo?: string;
    daysRemaining?: number;
    error?: string;
  };
  cookies: Array<{
    name: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: string;
  }>;
  exposed: {
    serverHeader: string;
    robotsTxt: string[];
    sitemapExists: boolean;
    directoryListing: boolean;
    redirectedToHttps?: boolean;
    finalUrl?: string;
  };
}

## SEO and Social Sharing

Metadata: Configured in app/layout.tsx with OpenGraph and Twitter tags for optimal sharing.
Images: Place a 1200x630px og-logo.png in /public for social media previews.

## Contributing
Contributions are welcome! Please:

Fork the repository.
Create a feature branch (git checkout -b feature/your-feature).
Commit your changes (git commit -m "Add your feature").
Push to the branch (git push origin feature/your-feature).
Open a pull request.

## License
MIT License. See LICENSE for details.