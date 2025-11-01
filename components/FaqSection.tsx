import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQSEction = () => {
  const faqs = [
    {
      question: "What is Scanly?",
      answer:
        "Scanly is a developer-friendly security analysis tool that scans both GitHub repositories and live websites. It helps you detect vulnerabilities, insecure configurations, and missing protections in your code or hosted site.",
    },
    {
      question: "What can Scanly scan?",
      answer:
        "Scanly supports two types of scans: code repository scans (via GitHub URL) and website scans (via website URL). It checks for issues like outdated dependencies, secrets, SQL injection patterns, SSL validity, missing security headers, unsafe cookies, and more.",
    },
    {
      question: "Do I need to install anything?",
      answer:
        "No installation is required. Just provide your public GitHub repository link or website URL, and Scanly will perform the analysis directly in the cloud.",
    },
    {
      question: "Is my data or code safe during scans?",
      answer:
        "Yes. Your repository is cloned to a temporary environment and deleted automatically after scanning. Website scans only read publicly available information—no data is stored or shared.",
    },
    {
      question: "How accurate is the website scan?",
      answer:
        "The website scanner checks for SSL/TLS validity, HTTP security headers, exposed server info, and cookie safety. It uses real-time requests to your website and rates your configuration with a security score between 0 and 100.",
    },
    {
      question: "What types of vulnerabilities does Scanly detect in code?",
      answer:
        "In code repositories, Scanly looks for hardcoded secrets, outdated dependencies, insecure functions, SQL injection risks, risky licenses, and Docker misconfigurations.",
    },
    {
      question: "Can Scanly check SSL certificates and HTTPS redirection?",
      answer:
        "Yes. When scanning websites, Scanly verifies if SSL is valid, detects HTTPS redirects, checks certificate expiry, and flags insecure or expiring certificates.",
    },
    {
      question: "Can I scan private GitHub repositories?",
      answer:
        "Currently, only public repositories are supported. Support for private repositories using access tokens will be added soon.",
    },
    {
      question: "What does the security score mean?",
      answer:
        "The security score summarizes your project’s or site’s security posture from 0 to 100. It’s calculated based on the severity and number of detected issues — higher is better.",
    },
    {
      question: "Does Scanly support other languages besides JavaScript?",
      answer:
        "At the moment, Scanly focuses on JavaScript and Node.js projects. Support for Python, PHP, and Java will be introduced in future updates.",
    },
    {
      question: "Why did I see 'Rate limit exceeded'?",
      answer:
        "To prevent abuse, Scanly limits the number of scans you can perform per minute. Please wait a short while before scanning again.",
    },
    {
      question: "Can I download or share my scan results?",
      answer:
        "Yes. You can export your scan report or share your security score with teammates to help track and prioritize fixes.",
    },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
            Everything you need to know about how Scanly works, data privacy,
            and scanning results.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border rounded-lg px-6 py-2 bg-card"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSEction;
