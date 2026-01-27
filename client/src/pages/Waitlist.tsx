import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWaitlistSchema, type InsertWaitlist } from "@shared/schema";
import { useAddToWaitlist } from "@/hooks/use-waitlist";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Mail, MapPin, Sparkles, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export default function Waitlist() {
  const mutation = useAddToWaitlist();
  const { toast } = useToast();

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
          description: "We'll notify you when GapNight launches in your area.",
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

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <Navigation />

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div className="absolute top-[10%] left-[5%] w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
         <div className="absolute bottom-[10%] right-[5%] w-96 h-96 bg-accent/20 rounded-full blur-3xl"></div>
      </div>
      
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-lg space-y-8 text-center">
          
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">
              Coming to your city soon
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              We're expanding rapidly. Join the waitlist to get early access and exclusive deals when GapNight launches in your area.
            </p>
          </div>

          <div className="bg-card border border-border/50 shadow-xl rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
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
                          <Input type="email" placeholder="you@example.com" className="pl-9 h-11" {...field} />
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
                      <FormLabel>Which city are you waiting for?</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="e.g. Sydney, London, New York" 
                            className="pl-9 h-11" 
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
                  className="w-full text-lg font-bold h-12 shadow-lg shadow-primary/25 mt-4"
                  disabled={mutation.isPending}
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
      </main>
      <Footer />
    </div>
  );
}
