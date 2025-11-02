# Scanly API

## Overview
Scanly is a fast, free, and user-friendly tool to analyze website security. It checks HTTP headers, SSL/TLS configurations, cookies, scanning public GitHub repositories for vulnerabilities, hardcoded secrets, outdated dependencies and exposed information to identify vulnerabilities and provide actionable recommendations.


## Features
- **Next.js**: Full-stack framework for building the API endpoints and server-side logic.
- **TypeScript**: Provides static typing for robust and maintainable code.
- **ssl-checker**: Verifies the validity and expiration of SSL/TLS certificates.
- **adm-zip**: Downloads and extracts GitHub repositories from a ZIP archive for code analysis.
- **Rate Limiting**: Implements in-memory rate limiting to prevent API abuse.

## Getting Started
### Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/Maxzi3/scanly.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd scanly
    ```
3.  Install the required dependencies:
    ```bash
    npm install
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

### Environment Variables
This project does not require any environment variables for its core functionality to run.

## API Documentation
### Base URL
`http://localhost:3000/api`

### Endpoints
#### POST /api/scan
Scans a given website URL for security misconfigurations, including headers, TLS certificate, and cookies.

**Request**:
```json
{
  "url": "https://example.com"
}
```
- `url` (string, required): The full URL of the website to scan. Must start with `http://` or `https://`.

**Response**:
```json
{
  "url": "https://example.com",
  "headers": {
    "csp": true,
    "xFrameOptions": true,
    "xContentTypeOptions": true,
    "hsts": true,
    "referrerPolicy": false,
    "permissionsPolicy": false,
    "xXssProtection": true,
    "crossOriginEmbedderPolicy": false,
    "crossOriginOpenerPolicy": false,
    "crossOriginResourcePolicy": false
  },
  "tls": {
    "valid": true,
    "daysRemaining": 89,
    "validFrom": "2024-05-22T00:00:00.000Z",
    "validTo": "2024-08-20T23:59:59.000Z",
    "issuer": "Let's Encrypt"
  },
  "exposed": {
    "serverHeader": "Not disclosed",
    "robotsTxt": ["User-agent: *", "Disallow: /"],
    "sitemapExists": true,
    "directoryListing": false,
    "redirectedToHttps": true,
    "finalUrl": "https://example.com/"
  },
  "cookies": [
    {
      "name": "session_id",
      "httpOnly": true,
      "secure": true,
      "sameSite": "Strict"
    }
  ],
  "securityScore": 95
}
```

**Errors**:
- `400 Bad Request`: Invalid URL format provided.
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: The target website could not be reached or an unexpected error occurred during the scan.

#### POST /api/scan-code
Scans a public GitHub repository for security vulnerabilities, including outdated packages, hardcoded secrets, insecure functions, and SAST findings.

**Request**:
```json
{
  "repoUrl": "https://github.com/username/repository",
  "branch": "main"
}
```
- `repoUrl` (string, required): The full URL of the public GitHub repository.
- `branch` (string, optional): The name of the branch to scan. Defaults to `main`.

**Response**:
```json
{
  "repoUrl": "https://github.com/username/repository",
  "scanDate": "2024-05-25T12:00:00.000Z",
  "summary": {
    "totalIssues": 5,
    "critical": 1,
    "high": 2,
    "medium": 1,
    "low": 1,
    "securityScore": 75
  },
  "outdatedPackages": [
    {
      "name": "express",
      "currentVersion": "4.17.1",
      "latestVersion": "4.19.2",
      "severity": "high",
      "cve": "CVE-2022-24999"
    }
  ],
  "hardcodedSecrets": [
    {
      "file": "src/config.js",
      "line": 10,
      "type": "api_key",
      "preview": "const API_KEY = 'sk_live_...';"
    }
  ],
  "insecureFunctions": [
    {
      "file": "src/utils.js",
      "line": 5,
      "function": "eval",
      "risk": "Code Injection",
      "suggestion": "Avoid using eval(). Use safer alternatives like JSON.parse for data parsing."
    }
  ],
  "licenseIssues": [
    {
      "package": "some-package",
      "license": "AGPL-3.0",
      "risk": "high",
      "reason": "Restrictive copyleft license"
    }
  ],
  "dockerIssues": [],
  "sastFindings": [
    {
      "file": "src/db.js",
      "line": 25,
      "type": "sql_injection",
      "severity": "critical",
      "code": "db.query(`SELECT * FROM users WHERE id = ${userId}`)",
      "description": "Direct user input is used in an SQL query, leading to potential SQL injection."
    }
  ],
  "recommendations": [
    "🔐 Remove 1 hardcoded secret",
    "⚠️ Update 1 critically outdated package",
    "🛡️ Fix 1 security issue in code",
    "⚡ Replace 1 insecure function",
    "📜 Review 1 license issue (1 high risk)"
  ]
}
```

**Errors**:
- `400 Bad Request`: Invalid GitHub URL format provided.
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Failed to download or scan the repository. This may occur if the repository or branch does not exist.