import { Link } from "wouter";
import { Home, Search, ArrowLeft, HelpCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { GapNightLogo } from "@/components/GapNightLogo";

// Generate a short support code for reference
const generateSupportCode = () => {
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const random = Math.random().toString(36).slice(-3).toUpperCase();
  return `404-${timestamp}${random}`;
};

export default function NotFound() {
  const supportCode = generateSupportCode();
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center max-w-md mx-auto">
          {/* 404 Display */}
          <div className="mb-6 relative">
            <div className="text-[120px] md:text-[160px] font-display font-bold text-muted-foreground/20 leading-none select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <GapNightLogo size={48} />
              </div>
            </div>
          </div>
          
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
            Page not found
          </h1>
          <p className="text-muted-foreground mb-8">
            Sorry, we couldn't find the page you're looking for. It may have been moved or doesn't exist.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Link href="/">
              <Button size="lg" className="w-full sm:w-auto font-bold rounded-xl gap-2">
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </Link>
            <Link href="/deals">
              <Button size="lg" variant="outline" className="w-full sm:w-auto font-medium rounded-xl gap-2">
                <Search className="w-4 h-4" />
                Browse Deals
              </Button>
            </Link>
          </div>

          {/* Support Section */}
          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
              <HelpCircle className="w-4 h-4" />
              <span>Having trouble?</span>
              <a 
                href="mailto:support@gapnight.com?subject=Support Request - Error ${supportCode}" 
                className="text-primary hover:underline font-medium"
              >
                Contact support
              </a>
            </div>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground/60">
              <MessageSquare className="w-3 h-3" />
              <span>Reference code: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{supportCode}</code></span>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
