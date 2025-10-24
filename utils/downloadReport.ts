import jsPDF from "jspdf";

interface DownloadReportData {
  url?: string;
  securityScore?: number;
  headers?: Record<string, boolean>;
  tls?: {
    valid?: boolean;
    issuer?: string;
    validTo?: string;
  };
  cookies?: Array<{
    name?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: string;
  }>;
  exposed?: {
    serverHeader?: string;
    directoryListing?: boolean;
    sitemapExists?: boolean;
  };
}

export const downloadReport = (data: DownloadReportData) => {
  const doc = new jsPDF();
  const margin = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - 2 * margin;
  let y = margin;

  // Set font styles
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);

  // Title
  doc.text("Website Security Scan Report", margin, y, { align: "left" });
  y += 10;

  // Metadata
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`URL: ${data.url || "N/A"}`, margin, y);
  y += 7;
  doc.text(`Date: ${new Date().toLocaleString()}`, margin, y);
  y += 10;

  // Security Score
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Security Score", margin, y);
  y += 7;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${data.securityScore || 0}/100`, margin + 5, y);
  y += 10;

  // Headers Section
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Security Headers", margin, y);
  y += 7;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  Object.entries(data.headers || {}).forEach(([key, value]) => {
    doc.text(`${key}: ${value ? "Configured" : "Not set"}`, margin + 5, y, {
      maxWidth,
    });
    y += 7;
  });
  y += 5;

  // SSL/TLS Section
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SSL/TLS Configuration", margin, y);
  y += 7;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Valid: ${data.tls?.valid ? "Yes" : "No"}`, margin + 5, y);
  y += 7;
  doc.text(`Issuer: ${data.tls?.issuer || "N/A"}`, margin + 5, y);
  y += 7;
  doc.text(`Expiry: ${data.tls?.validTo || "N/A"}`, margin + 5, y);
  y += 10;

  // Cookies Section
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Cookies", margin, y);
  y += 7;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  (data.cookies || []).forEach((cookie, index) => {
    doc.text(
      `Cookie ${index + 1}: ${cookie.name || "N/A"} (Secure: ${
        cookie.secure ? "Yes" : "No"
      }, HttpOnly: ${cookie.httpOnly ? "Yes" : "No"}, SameSite: ${
        cookie.sameSite || "N/A"
      })`,
      margin + 5,
      y,
      { maxWidth }
    );
    y += 7;
  });
  y += 5;

  // Exposed Information
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Exposed Information", margin, y);
  y += 7;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Server Header: ${data.exposed?.serverHeader || "N/A"}`,
    margin + 5,
    y,
    { maxWidth }
  );
  y += 7;
  doc.text(
    `Directory Listing: ${
      data.exposed?.directoryListing ? "Enabled" : "Disabled"
    }`,
    margin + 5,
    y
  );
  y += 7;
  doc.text(
    `Sitemap: ${data.exposed?.sitemapExists ? "Found" : "Not found"}`,
    margin + 5,
    y
  );

  // Save the PDF
  doc.save(`security-report-${new Date().getTime()}.pdf`);
};
