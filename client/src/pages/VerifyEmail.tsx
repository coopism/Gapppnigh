import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle, Mail } from "lucide-react";
import { verifyEmail } from "@/hooks/useAuth";
import { GapNightLogo } from "@/components/GapNightLogo";
import { Footer } from "@/components/Footer";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    
    if (!token) {
      setError("Invalid verification link");
      setIsLoading(false);
      return;
    }

    verifyEmail(token).then((result) => {
      setIsLoading(false);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Failed to verify email");
      }
    });
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Verifying email...</h1>
            <p className="text-muted-foreground mt-2">Please wait while we verify your email address</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>This should only take a moment...</span>
              </div>
            </div>
          </div>
        </>
      );
    }

    if (success) {
      return (
        <>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Email verified!</h1>
            <p className="text-muted-foreground mt-2">Your email has been successfully verified</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              You now have full access to your account. Start browsing exclusive deals!
            </p>
            <Button 
              className="w-full h-11 rounded-xl font-bold shadow-md hover:shadow-lg transition-all" 
              onClick={() => setLocation("/account")}
            >
              Go to my account
            </Button>
            <div className="text-center">
              <Link href="/deals" className="text-sm text-primary hover:underline font-medium">
                Browse deals
              </Link>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Verification failed</h1>
          <p className="text-muted-foreground mt-2">{error || "This verification link is invalid or has expired"}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Please request a new verification email from your account settings.
          </p>
          <Button 
            className="w-full h-11 rounded-xl font-bold" 
            onClick={() => setLocation("/account")}
          >
            Go to my account
          </Button>
          <div className="text-center">
            <Link href="/login" className="text-sm text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="group-hover:scale-110 transition-transform">
                <GapNightLogo size={32} />
              </div>
              <span className="font-display font-bold text-xl tracking-tight">GapNight</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {renderContent()}
        </div>
      </main>

      <Footer />
    </div>
  );
}
