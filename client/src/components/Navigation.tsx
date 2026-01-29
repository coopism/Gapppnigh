import { Link, useLocation } from "wouter";
import { Hotel, Menu, Home, Sparkles, UserPlus, Moon, Sun, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "./ThemeProvider";

export function Navigation() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const isActive = (path: string) => location === path;

  return (
    <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">GapNight</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/deals" className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/deals") ? "text-primary" : "text-muted-foreground"}`}>
              Browse Deals
            </Link>
            <Link href="/list-your-hotel" className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/list-your-hotel") ? "text-primary" : "text-muted-foreground"}`}>
              For Hotels
            </Link>
            <Link 
              href="/owner/login" 
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/owner/login") ? "text-primary" : "text-muted-foreground"}`}
              data-testid="link-developer-portal-nav"
            >
              Developer Portal
            </Link>
            <ThemeToggle />
            <Link href="/waitlist">
               <Button variant={isActive("/waitlist") ? "secondary" : "default"} size="sm" className="rounded-full px-5 font-bold shadow-md hover:shadow-lg transition-all">
                Join Waitlist
              </Button>
            </Link>
          </div>

          {/* Mobile Nav */}
          <div className="md:hidden flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle className="font-display text-2xl font-bold flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-primary" />
                    GapNight
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-8 flex flex-col gap-4">
                  <Link href="/deals">
                    <Button variant="ghost" className="w-full justify-start text-lg font-medium h-12">
                      <Home className="w-5 h-5 mr-3" /> Browse Deals
                    </Button>
                  </Link>
                  <Link href="/list-your-hotel">
                    <Button variant="ghost" className="w-full justify-start text-lg font-medium h-12">
                      <Hotel className="w-5 h-5 mr-3" /> List Your Hotel
                    </Button>
                  </Link>
                  <Link href="/owner/login" data-testid="link-developer-portal-mobile">
                    <Button variant="ghost" className="w-full justify-start text-lg font-medium h-12">
                      <Code className="w-5 h-5 mr-3" /> Developer Portal
                    </Button>
                  </Link>
                  <Link href="/waitlist">
                    <Button className="w-full justify-start text-lg font-bold h-12 mt-4">
                      <UserPlus className="w-5 h-5 mr-3" /> Join Waitlist
                    </Button>
                  </Link>
                  <div className="border-t border-border/50 mt-4 pt-4">
                    <Button
                      variant="ghost"
                      onClick={toggleTheme}
                      className="w-full justify-start text-lg font-medium h-12"
                      data-testid="button-theme-toggle-mobile"
                    >
                      {theme === "light" ? (
                        <Moon className="w-5 h-5 mr-3" />
                      ) : (
                        <Sun className="w-5 h-5 mr-3" />
                      )}
                      {theme === "light" ? "Dark Mode" : "Light Mode"}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
