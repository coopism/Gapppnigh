import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Moon, Loader2, AlertCircle, CheckCircle, Mail } from "lucide-react";
import { verifyEmail } from "@/hooks/useAuth";

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold">
              <Moon className="w-8 h-8 text-primary" />
              <span>GapNight</span>
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
              <CardTitle>Verifying your email...</CardTitle>
              <CardDescription>
                Please wait while we verify your email address.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold">
              <Moon className="w-8 h-8 text-primary" />
              <span>GapNight</span>
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle>Email verified!</CardTitle>
              <CardDescription>
                Your email has been successfully verified. You now have full access to your account.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col gap-4">
              <Button className="w-full" onClick={() => setLocation("/account")}>
                Go to my account
              </Button>
              <Link href="/" className="text-sm text-primary hover:underline">
                Browse deals
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold">
            <Moon className="w-8 h-8 text-primary" />
            <span>GapNight</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle>Verification failed</CardTitle>
            <CardDescription>
              {error || "This verification link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>Please request a new verification email from your account settings.</p>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" onClick={() => setLocation("/account")}>
              Go to my account
            </Button>
            <Link href="/login" className="text-sm text-primary hover:underline">
              Sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
