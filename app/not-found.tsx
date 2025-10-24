import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <section className="section-container text-center min-h-screen flex flex-col justify-center items-center bg-background">
      <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
      <p className="text-2xl text-muted-foreground mb-6">
        Oops! The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        It looks like you took a wrong turn. Let&apos;s get you back to safety
        with Scanly.
      </p>
      <Link href="/">
        <Button
          size="lg"
          className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
        >
          <Home className="w-5 h-5 mr-2" />
          Back to Home
        </Button>
      </Link>
    </section>
  );
}
