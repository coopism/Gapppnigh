import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Check, X, ShieldCheck } from "lucide-react";
import { resetPassword, validatePassword, getPasswordStrength } from "@/hooks/useAuth";
import { GapNightLogo } from "@/components/GapNightLogo";
import { Footer } from "@/components/Footer";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordValidation = validatePassword(password);
  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    if (!token) {
      setError("Invalid or missing reset token");
      return;
    }

    if (!passwordValidation.valid) {
      setError("Password does not meet requirements");
      setFieldError("password");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setFieldError("confirmPassword");
      return;
    }

    setIsLoading(true);

    const result = await resetPassword(token, password);

    setIsLoading(false);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || "Failed to reset password");
      setFieldError(result.field || null);
    }
  };

  // Render states
  const renderContent = () => {
    if (!token) {
      return (
        <>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Invalid link</h1>
            <p className="text-muted-foreground mt-2">This password reset link is invalid or has expired</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg text-center space-y-4">
            <p className="text-sm text-muted-foreground">Please request a new password reset link.</p>
            <Link href="/forgot-password">
              <Button className="w-full h-11 rounded-xl font-bold">Request new link</Button>
            </Link>
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
            <h1 className="text-3xl font-display font-bold tracking-tight">Password reset!</h1>
            <p className="text-muted-foreground mt-2">Your password has been successfully updated</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg space-y-4">
            <p className="text-sm text-muted-foreground text-center">You can now sign in with your new password.</p>
            <Link href="/login">
              <Button className="w-full h-11 rounded-xl font-bold shadow-md hover:shadow-lg transition-all">
                Sign in
              </Button>
            </Link>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Set new password</h1>
          <p className="text-muted-foreground mt-2">Create a strong password for your account</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 pr-10 h-11 rounded-xl ${fieldError === "password" ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              {password && (
                <div className="space-y-2 mt-3 p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground w-16">{passwordStrength.label}</span>
                  </div>
                  <ul className="text-xs space-y-1.5 mt-2">
                    <li className={`flex items-center gap-2 ${password.length >= 10 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                      {password.length >= 10 ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      At least 10 characters
                    </li>
                    <li className={`flex items-center gap-2 ${passwordValidation.valid ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                      {passwordValidation.valid ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      Include 3 of: uppercase, lowercase, number, symbol
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm new password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-10 h-11 rounded-xl ${fieldError === "confirmPassword" ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  required
                  autoComplete="new-password"
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <X className="h-3 w-3" /> Passwords do not match
                </p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                  <Check className="h-3 w-3" /> Passwords match
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 rounded-xl font-bold text-base shadow-md hover:shadow-lg transition-all mt-2" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset password"
              )}
            </Button>
          </form>
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
