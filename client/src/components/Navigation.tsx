import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Hotel, Menu, Home, UserPlus, User, LogOut, Heart, MessageSquare, LayoutDashboard } from "lucide-react";
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
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      fetch("/api/messages/unread", { credentials: "include" })
        .then(r => r.ok ? r.json() : { count: 0 })
        .then(d => setUnreadCount(d.count || 0))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const isActive = (path: string) => location === path;

  return (
    <nav className="sticky top-0 z-50 w-full"
      style={{
        background: "rgba(255,255,255,0.78)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.65)",
        boxShadow: "0 2px 24px rgba(100,120,200,0.10)",
      }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="group-hover:scale-110 transition-transform">
              <GapNightLogo size={32} />
            </div>
            <span className="font-display font-bold text-xl tracking-tight" style={{ color: "var(--clay-text)" }}>GapNight</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/deals">
              <button className={`text-sm font-medium px-4 py-2 rounded-full transition-all ${isActive("/deals") ? "bg-primary/10 text-primary font-semibold" : "text-[var(--clay-text-muted)] hover:bg-white/60 hover:text-[var(--clay-text)]"}`}>
                Browse Deals
              </button>
            </Link>
            <Link href="/host/dashboard">
              <button className={`text-sm font-medium px-4 py-2 rounded-full transition-all ${location.startsWith("/host") ? "bg-primary/10 text-primary font-semibold" : "text-[var(--clay-text-muted)] hover:bg-white/60 hover:text-[var(--clay-text)]"}`}>
                Host Dashboard
              </button>
            </Link>
            {!isLoading && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="clay-btn-ghost text-sm px-4 py-2 inline-flex items-center gap-2 ml-1" style={{ borderRadius: "var(--clay-radius-pill)", fontSize: "0.875rem" }}>
                      <User className="w-4 h-4" />
                      <span className="max-w-24 truncate">{user.name || user.email.split('@')[0]}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-2xl border-white/70 shadow-clay">
                    <DropdownMenuItem asChild>
                      <Link href="/saved" className="cursor-pointer">
                        <Heart className="w-4 h-4 mr-2" /> Saved Listings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account?tab=messages" className="cursor-pointer">
                        <MessageSquare className="w-4 h-4 mr-2" /> Messages
                        {unreadCount > 0 && <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{unreadCount}</span>}
                      </Link>
                    </DropdownMenuItem>
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
                  <button className="clay-btn-ghost text-sm px-4 py-2 ml-1" style={{ borderRadius: "var(--clay-radius-pill)" }}>
                    Sign in
                  </button>
                </Link>
              )
            )}
            <Link href="/waitlist">
              <button className="clay-btn text-sm px-5 py-2 ml-1" style={{ borderRadius: "var(--clay-radius-pill)" }}>
                Join Waitlist
              </button>
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
                  <Link href="/host/dashboard">
                    <Button variant="ghost" className="w-full justify-start text-lg font-medium h-12">
                      <LayoutDashboard className="w-5 h-5 mr-3" /> Host Dashboard
                    </Button>
                  </Link>
                  {!isLoading && (
                    user ? (
                      <>
                        <Link href="/saved">
                          <Button variant="ghost" className="w-full justify-start text-lg font-medium h-12">
                            <Heart className="w-5 h-5 mr-3" /> Saved Listings
                          </Button>
                        </Link>
                        <Link href="/account?tab=messages">
                          <Button variant="ghost" className="w-full justify-start text-lg font-medium h-12 relative">
                            <MessageSquare className="w-5 h-5 mr-3" /> Messages
                            {unreadCount > 0 && <span className="ml-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{unreadCount}</span>}
                          </Button>
                        </Link>
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
