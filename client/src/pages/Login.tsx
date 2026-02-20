import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { login } from "@/hooks/useAuth";
import { GapNightLogo } from "@/components/GapNightLogo";
import { Footer } from "@/components/Footer";
import { CloudBackground } from "@/components/ui/clay";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(false);

  // Initialize Google Sign-In SDK (callback only — button is always rendered natively)
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const initGoogle = () => {
      // @ts-ignore
      if (!window.google?.accounts?.id) return;
      // @ts-ignore
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          setIsLoading(true);
          setError(null);
          try {
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get("redirect") || "/account";
            const res = await fetch("/api/auth/oauth/google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ credential: response.credential, redirectUrl: redirect }),
            });
            const data = await res.json();
            if (data.success) {
              window.location.href = data.redirectUrl || "/account";
            } else {
              setError(data.message || "Google sign-in failed");
            }
          } catch (err) {
            setError("Google sign-in failed. Please try again.");
          }
          setIsLoading(false);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      setGoogleReady(true);
    };

    // @ts-ignore
    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        // @ts-ignore
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogle();
        }
      }, 100);
      const timeout = setTimeout(() => clearInterval(interval), 10000);
      return () => { clearInterval(interval); clearTimeout(timeout); };
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);
    setIsLoading(true);

    const result = await login(email, password, rememberMe);

    setIsLoading(false);

    if (result.success) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "/account";
      setLocation(redirect);
    } else {
      setError(result.error || "Login failed");
      setFieldError(result.field || null);
    }
  };

  return (
    <CloudBackground>
      <div className="relative flex flex-col min-h-screen" style={{ zIndex: 1 }}>
        {/* Slim clay nav */}
        <header style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.60)", boxShadow: "0 2px 20px rgba(100,120,200,0.08)" }}>
          <div className="max-w-5xl mx-auto px-4 flex justify-between items-center h-14">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="group-hover:scale-110 transition-transform"><GapNightLogo size={28} /></div>
              <span className="font-display font-bold text-lg tracking-tight" style={{ color: "var(--clay-text)" }}>GapNight</span>
            </Link>
            <Link href="/deals">
              <button className="clay-btn-ghost text-sm px-4 py-2 inline-flex items-center gap-1.5" style={{ borderRadius: "var(--clay-radius-pill)" }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back to deals
              </button>
            </Link>
          </div>
        </header>

        {/* Centered content */}
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">

            {/* Pill tab switcher: Sign In / Create Account */}
            <div className="clay-card-sm p-1.5 flex mb-6" style={{ borderRadius: "var(--clay-radius-pill)" }}>
              <Link href="/login" className="flex-1">
                <button className="w-full py-2.5 text-sm font-semibold rounded-full transition-all clay-btn" style={{ borderRadius: "var(--clay-radius-pill)" }}>
                  Sign In
                </button>
              </Link>
              <Link href="/signup" className="flex-1">
                <button className="w-full py-2.5 text-sm font-medium rounded-full transition-all" style={{ color: "var(--clay-text-muted)" }}>
                  Create Account
                </button>
              </Link>
            </div>

            {/* Main clay panel */}
            <div className="clay-panel p-8">
              <div className="mb-7">
                <h1 className="text-2xl font-display font-bold mb-1" style={{ color: "var(--clay-text)" }}>Welcome back</h1>
                <p className="text-sm" style={{ color: "var(--clay-text-muted)" }}>Discover discounted gap night stays.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 text-sm p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", color: "#DC2626", border: "1px solid rgba(239,68,68,0.20)" }}>
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--clay-text)" }}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--clay-text-light)" }} />
                    <input
                      id="email" type="email" placeholder="email address"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      className="clay-input pl-10"
                      style={fieldError === "email" ? { borderColor: "#EF4444" } : {}}
                      required autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--clay-text)" }}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--clay-text-light)" }} />
                    <input
                      id="password" type={showPassword ? "text" : "password"} placeholder="Password"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      className="clay-input pl-10 pr-12"
                      style={fieldError === "password" ? { borderColor: "#EF4444" } : {}}
                      required autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: "var(--clay-text-light)" }}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember me + T&C */}
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" checked={rememberMe}
                    onCheckedChange={(c) => setRememberMe(c === true)}
                    className="rounded" />
                  <label htmlFor="remember" className="text-sm cursor-pointer" style={{ color: "var(--clay-text-muted)" }}>
                    I agree to the <Link href="/terms" className="font-medium hover:underline" style={{ color: "var(--clay-primary)" }}>Terms</Link> and{" "}
                    <Link href="/privacy" className="font-medium hover:underline" style={{ color: "var(--clay-primary)" }}>Privacy Policy</Link>
                  </label>
                </div>

                {/* Submit */}
                <button type="submit" disabled={isLoading}
                  className="clay-btn w-full py-3.5 text-base font-bold mt-2"
                  style={{ borderRadius: "var(--clay-radius-pill)" }}>
                  {isLoading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Signing in...</>
                    : "Sign In"}
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: "rgba(107,122,154,0.20)" }} />
                <span className="text-xs" style={{ color: "var(--clay-text-muted)" }}>or</span>
                <div className="flex-1 h-px" style={{ background: "rgba(107,122,154,0.20)" }} />
              </div>

              {/* OAuth */}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" disabled={isLoading}
                  className="clay-btn-ghost py-3 text-sm font-medium inline-flex items-center justify-center gap-2"
                  style={{ borderRadius: "var(--clay-radius-pill)" }}
                  onClick={() => {
                    if ((window as any).google?.accounts?.id) {
                      (window as any).google.accounts.id.prompt();
                    } else {
                      setError("Google Sign-In is not available.");
                    }
                  }}>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
                <button type="button"
                  className="clay-btn-ghost py-3 text-sm font-medium inline-flex items-center justify-center gap-2"
                  style={{ borderRadius: "var(--clay-radius-pill)" }}
                  onClick={() => setError("Facebook Sign-In coming soon")}>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm" style={{ color: "var(--clay-text-muted)" }}>
                  Forgot password?{" "}
                  <Link href="/forgot-password" className="font-semibold hover:underline" style={{ color: "var(--clay-primary)" }}>Reset it</Link>
                  {"  ·  "}
                  <Link href="/signup" className="font-semibold hover:underline" style={{ color: "var(--clay-primary)" }}>Create account</Link>
                </p>
              </div>
            </div>

          </div>
        </main>
      </div>
    </CloudBackground>
  );
}
