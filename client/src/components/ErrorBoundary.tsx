import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, HelpCircle, MessageSquare } from "lucide-react";
import { GapNightLogo } from "./GapNightLogo";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  supportCode: string;
}

// Generate a short support code for reference
const generateSupportCode = () => {
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const random = Math.random().toString(36).slice(-3).toUpperCase();
  return `ERR-${timestamp}${random}`;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, supportCode: generateSupportCode() };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, supportCode: generateSupportCode() };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex flex-col bg-background">
          <header className="border-b border-border/50 bg-background/80 backdrop-blur-md">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <a href="/" className="flex items-center gap-2 group">
                  <div className="group-hover:scale-110 transition-transform">
                    <GapNightLogo size={32} />
                  </div>
                  <span className="font-display font-bold text-xl tracking-tight">GapNight</span>
                </a>
              </div>
            </div>
          </header>

          <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
            <div className="text-center max-w-md mx-auto">
              <div className="mb-6">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-10 h-10 text-destructive" />
                </div>
              </div>

              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
                Something went wrong
              </h1>
              <p className="text-muted-foreground mb-6">
                We encountered an unexpected error. Please try refreshing the page or go back to the homepage.
              </p>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="mb-6 p-4 bg-muted rounded-lg text-left">
                  <p className="text-sm font-mono text-destructive break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
                <Button
                  size="lg"
                  onClick={this.handleReload}
                  className="w-full sm:w-auto font-bold rounded-xl gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Page
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="w-full sm:w-auto font-medium rounded-xl gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </div>

              {/* Support Section */}
              <div className="border-t border-border pt-6">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                  <HelpCircle className="w-4 h-4" />
                  <span>Having trouble?</span>
                  <a 
                    href={`mailto:support@gapnight.com?subject=Support Request - Error ${this.state.supportCode}`}
                    className="text-primary hover:underline font-medium"
                  >
                    Contact support
                  </a>
                </div>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground/60">
                  <MessageSquare className="w-3 h-3" />
                  <span>Reference code: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{this.state.supportCode}</code></span>
                </div>
              </div>
            </div>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}
