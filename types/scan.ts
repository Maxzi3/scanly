export type HeaderChecks = {
  csp: boolean;
  xFrameOptions: boolean;
  xContentTypeOptions: boolean;
  hsts: boolean;
  referrerPolicy: boolean;
  permissionsPolicy: boolean;
  xXssProtection: boolean;
  crossOriginEmbedderPolicy: boolean;
  crossOriginOpenerPolicy: boolean;
  crossOriginResourcePolicy: boolean;
};

export type TLSInfo = {
  valid: boolean;
  daysRemaining?: number;
  validFrom?: string;
  validTo?: string;
  issuer?: string;
  error?: string;
};

export type ExposedInfo = {
  serverHeader: string;
  robotsTxt: string[];
  sitemapExists: boolean;
  directoryListing: boolean;
  redirectedToHttps?: boolean;
  finalUrl?: string;
};

export type CookieInfo = {
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
};

export interface ScanReport {
  url: string;
  headers: HeaderChecks;
  tls: TLSInfo;
  exposed: ExposedInfo;
  cookies: CookieInfo[];
  securityScore?: number;
}

export interface ScanRequest {
  url: string;
}

export interface SSLCheckerResult {
  valid: boolean;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  validFor: string[];
  issuer?: string;
}
