"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code2, Globe } from "lucide-react";
import CodeScanResults from "./CodeScanResults";
import WebsiteUrlCheck from "./Scanner";

const ScannerTabs = () => {
  return (
    <section id="scanner" className="py-16 px-2 max-w-6xl mx-auto">
      <Tabs defaultValue="website" className="w-full flex flex-col gap-8">
        {/* Tabs Navigation */}
        <TabsList
          className="
            grid grid-cols-2 
            w-full md:w-10/12 mx-auto
            rounded-xl overflow-hidden 
            bg-muted/20 border border-border
          "
        >
          <TabsTrigger
            value="website"
            className="
              flex items-center justify-center gap-2 
              text-sm sm:text-base font-medium
              transition-all duration-300 
              data-[state=active]:bg-primary data-[state=active]:text-white
            "
          >
            <Globe className="w-5 h-5" />
            <span className="hidden sm:inline">Website URL Check</span>
            <span className="sm:hidden">Website</span>
          </TabsTrigger>

          <TabsTrigger
            value="code"
            className="
              flex items-center justify-center gap-2 
              text-sm sm:text-base font-medium
              transition-all duration-300 
              data-[state=active]:bg-primary data-[state=active]:text-white
            "
          >
            <Code2 className="w-5 h-5" />
            <span className="hidden sm:inline">Code & Dependency Scanner</span>
            <span className="sm:hidden">Code Scan</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <TabsContent value="code" className="animate-fadeIn">
          <CodeScanResults />
        </TabsContent>

        <TabsContent value="website" className="animate-fadeIn">
          <WebsiteUrlCheck />
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default ScannerTabs;
