import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWaitlistSchema, type InsertWaitlist } from "@shared/schema";
import { useAddToWaitlist } from "@/hooks/use-waitlist";
import { Footer } from "@/components/Footer";
import { Mail, MapPin, Sparkles, Lock, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/ThemeProvider";
import { Moon, Sun } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ComingSoonProps {
  onPartnerAccess: () => void;
}

export default function ComingSoon({ onPartnerAccess }: ComingSoonProps) {
  const mutation = useAddToWaitlist();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [partnerPassword, setPartnerPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<InsertWaitlist>({
    resolver: zodResolver(insertWaitlistSchema),
    defaultValues: {
      email: "",
      preferredCity: "",
    },
  });

  function onSubmit(data: InsertWaitlist) {
    mutation.mutate(data, {
      onSuccess: () => {
        form.reset();
        toast({
          title: "You're on the list!",
          description: "We'll notify you when GapNight launches.",
        });
      },
      onError: () => {
        toast({
          title: "Something went wrong",
          description: "Please try again later.",
          variant: "destructive",
        });
      },
    });
  }

  async function handlePartnerAccess(e: React.FormEvent) {
    e.preventDefault();
    setIsVerifying(true);
    
    try {
      const response = await fetch("/api/verify-partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: partnerPassword }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          localStorage.setItem("partner_access", "true");
          setDialogOpen(false);
          onPartnerAccess();
          toast({
            title: "Welcome, partner!",
            description: "You now have access to test the platform.",
          });
        } else {
          toast({
            title: "Invalid password",
            description: "Please check your access code and try again.",
            variant: "destructive",
          });
        }
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not verify access. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
      setPartnerPassword("");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Simple Header */}
      <header className="relative z-20 px-4 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">G</span>
            </div>
            <span className="font-display text-xl font-bold text-foreground">GapNight</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[5%] w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[20%] right-[5%] w-96 h-96 bg-accent/20 rounded-full blur-3xl"></div>
        <div className="absolute top-[40%] right-[20%] w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-2xl space-y-8">
          {/* Dictionary Card - Hero Definition */}
          <div className="bg-card/80 backdrop-blur-sm rounded-3xl p-6 md:p-10 border border-border/50 shadow-xl">
            {/* Coming Soon Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Coming Soon
            </div>

            {/* Header with title and pronunciation */}
            <div className="mb-6">
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-2" style={{ fontFamily: "Georgia, serif" }}>
                Gap Night
              </h1>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="text-lg md:text-xl italic">[gap-nahyt]</span>
                <span className="text-xs md:text-sm bg-muted px-3 py-1 rounded-full font-medium">noun</span>
              </div>
            </div>

            {/* Definition */}
            <div className="space-y-4 mb-8">
              <p className="text-lg md:text-2xl text-foreground leading-relaxed">
                An unsold night between hotel bookings — discounted so it doesn't go unused.
              </p>
              <p className="text-base md:text-lg text-muted-foreground max-w-lg">
                Hotels list these nights directly on GapNight, so you get real discounts on real rooms.
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-border/50 my-8"></div>

            {/* Waitlist Form */}
            <div className="max-w-md mx-auto text-center">
              <h2 className="text-xl font-semibold mb-4">Be the first to know</h2>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 text-left">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="email" 
                              placeholder="you@example.com" 
                              className="pl-9 h-11" 
                              data-testid="input-waitlist-email"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preferredCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred City (optional)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="e.g. Sydney, Melbourne" 
                              className="pl-9 h-11" 
                              data-testid="input-waitlist-city"
                              {...field} 
                              value={field.value || ""} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full text-lg font-bold h-12 shadow-lg shadow-primary/25"
                    disabled={mutation.isPending}
                    data-testid="button-join-waitlist"
                  >
                    {mutation.isPending ? "Joining..." : "Join the Waitlist"}
                  </Button>
                </form>
              </Form>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                We respect your inbox. No spam, just deals.
              </p>
            </div>
          </div>

          {/* Partner Access - Hidden but accessible */}
          <div className="text-center">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <button 
                  className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors inline-flex items-center gap-1"
                  data-testid="button-partner-access"
                >
                  <Lock className="w-3 h-3" />
                  Partner Access
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Partner Access</DialogTitle>
                  <DialogDescription>
                    Enter your partner access code to preview the platform.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePartnerAccess} className="space-y-4 mt-4">
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter access code"
                      value={partnerPassword}
                      onChange={(e) => setPartnerPassword(e.target.value)}
                      className="pr-10"
                      data-testid="input-partner-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isVerifying || !partnerPassword}
                    data-testid="button-verify-partner"
                  >
                    {isVerifying ? "Verifying..." : "Access Platform"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
