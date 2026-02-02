import { Link, useLocation } from "wouter";
import { Hotel, Menu, Home, UserPlus, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GapNightLogo } from "./GapNightLogo";
import { useAuthStore, logout } from "@/hooks/useAuth";

export function Navigation() {
  const [location, setLocation] = useLocation();
  const { user, isLoading } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const isActive = (path: string) => location === path;

  return (
    <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="group-hover:scale-110 transition-transform">
              <GapNightLogo size={32} />
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
            {!isLoading && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="rounded-full gap-2">
                      <User className="w-4 h-4" />
                      <span className="max-w-24 truncate">{user.name || user.email.split('@')[0]}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/account" className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" /> My Account
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                      <LogOut className="w-4 h-4 mr-2" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login">
                  <Button variant="outline" size="sm" className="rounded-full px-4">
                    Sign in
                  </Button>
                </Link>
              )
            )}
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
                <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-hamburger" aria-label="Open menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle className="font-display text-2xl font-bold flex items-center gap-2">
                    <GapNightLogo size={28} />
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
                      <Hotel className="w-5 h-5 mr-3" /> For Hotels
                    </Button>
                  </Link>
                  {!isLoading && (
                    user ? (
                      <>
                        <Link href="/account">
                          <Button variant="ghost" className="w-full justify-start text-lg font-medium h-12">
                            <User className="w-5 h-5 mr-3" /> My Account
                          </Button>
                        </Link>
                        <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-lg font-medium h-12 text-destructive">
                          <LogOut className="w-5 h-5 mr-3" /> Sign out
                        </Button>
                      </>
                    ) : (
                      <Link href="/login">
                        <Button variant="ghost" className="w-full justify-start text-lg font-medium h-12">
                          <User className="w-5 h-5 mr-3" /> Sign in
                        </Button>
                      </Link>
                    )
                  )}
                  <Link href="/waitlist">
                    <Button className="w-full justify-start text-lg font-bold h-12 mt-4">
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
