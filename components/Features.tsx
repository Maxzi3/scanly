import { Shield, Lock, Cookie, Code2, Gauge, Bug } from "lucide-react";
import { Card } from "./ui/card";

const features = [
  {
    icon: Shield,
    title: "Header Checks",
    description:
      "Detect missing security headers like CSP, X-Frame-Options, and HSTS to protect against common attacks.",
  },
  {
    icon: Lock,
    title: "SSL & TLS",
    description:
      "Find weak or expired certificates, outdated protocols, and encryption vulnerabilities.",
  },
  {
    icon: Cookie,
    title: "Cookie Safety",
    description:
      "Verify Secure and HttpOnly flags on cookies to prevent session hijacking and XSS attacks.",
  },
  {
    icon: Code2,
    title: "Dependency Audit",
    description:
      "Scan project dependencies for known vulnerabilities and outdated packages using npm audit.",
  },
  {
    icon: Bug,
    title: "Vulnerability Detection",
    description:
      "Identify potential security flaws or exposed configurations before they become critical threats.",
  },
  {
    icon: Gauge,
    title: "Performance & Health Insights",
    description:
      "Get insights into website responsiveness, certificate health, and best practices to improve security posture.",
  },
];

const Features = () => {
  return (
    <section id="features" className="bg-section">
      <div className="section-container">
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Comprehensive Security Analysis
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get instant insights into your website&apos;s security posture with
            automated checks
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="p-8 bg-card border-border card-hover">
              <feature.icon className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
