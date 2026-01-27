import { Link, useLocation } from "wouter";
import { Hotel, Menu, Home, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Navigation() {
  const [location] = useLocation();

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
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/") ? "text-primary" : "text-muted-foreground"}`}>
              Find Deals
            </Link>
            <Link href="/list-your-hotel" className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/list-your-hotel") ? "text-primary" : "text-muted-foreground"}`}>
              For Hotels
            </Link>
            <Link href="/waitlist">
               <Button variant={isActive("/waitlist") ? "secondary" : "default"} size="sm" className="rounded-full px-5 font-bold shadow-md hover:shadow-lg transition-all">
                Join Waitlist
              </Button>
            </Link>
          </div>

          {/* Mobile Nav */}
          <div className="md:hidden">
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
                  <Link href="/">
                    <Button variant="ghost" className="w-full justify-start text-lg font-medium h-12">
                      <Home className="w-5 h-5 mr-3" /> Find Deals
                    </Button>
                  </Link>
                  <Link href="/list-your-hotel">
                    <Button variant="ghost" className="w-full justify-start text-lg font-medium h-12">
                      <Hotel className="w-5 h-5 mr-3" /> List Your Hotel
                    </Button>
                  </Link>
                  <Link href="/waitlist">
                    <Button className="w-full justify-start text-lg font-bold h-12 mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
                      <UserPlus className="w-5 h-5 mr-3" /> Join Waitlist
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
