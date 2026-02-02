import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft, KeyRound } from "lucide-react";
import { forgotPassword } from "@/hooks/useAuth";
import { GapNightLogo } from "@/components/GapNightLogo";
import { Footer } from "@/components/Footer";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await forgotPassword(email);

    setIsLoading(false);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || "Failed to send reset email");
    }
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
            <Link href="/login">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {success ? (
            <>
              {/* Success State */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h1 className="text-3xl font-display font-bold tracking-tight">Check your email</h1>
                <p className="text-muted-foreground mt-2">We've sent a password reset link to <strong className="text-foreground">{email}</strong></p>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 shadow-lg space-y-4">
                <div className="text-center text-sm text-muted-foreground space-y-2">
                  <p>The link will expire in <strong>1 hour</strong>.</p>
                  <p>Didn't receive the email? Check your spam folder.</p>
                </div>

                <Button variant="outline" className="w-full h-11 rounded-xl" onClick={() => setSuccess(false)}>
                  Try another email
                </Button>

                <div className="text-center pt-2">
                  <Link href="/login" className="text-sm text-primary hover:underline font-medium">
                    Back to sign in
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Form State */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <KeyRound className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-display font-bold tracking-tight">Forgot password?</h1>
                <p className="text-muted-foreground mt-2">No worries, we'll send you reset instructions</p>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <Alert variant="destructive" className="rounded-xl">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11 rounded-xl"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 rounded-xl font-bold text-base shadow-md hover:shadow-lg transition-all" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send reset link"
                    )}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-border text-center">
                  <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
