import FAQSEction from "@/components/FaqSection";
import Features from "@/components/Features";
import Hero from "@/components/Hero";
import ScannerTabs from "@/components/ScannerTab";

export default function Home() {
  return (
    <div>
      <Hero />
      <Features />
      <ScannerTabs />
      <FAQSEction/>
    </div>
  );
}
