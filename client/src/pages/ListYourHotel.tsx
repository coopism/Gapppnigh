import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertHotelInquirySchema, type InsertHotelInquiry } from "@shared/schema";
import { useSubmitHotelInquiry } from "@/hooks/use-hotel-inquiries";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Building2, CheckCircle, Mail, MapPin } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ListYourHotel() {
  const mutation = useSubmitHotelInquiry();
  const { toast } = useToast();

  const form = useForm<InsertHotelInquiry>({
    resolver: zodResolver(insertHotelInquirySchema),
    defaultValues: {
      hotelName: "",
      city: "",
      contactEmail: "",
      gapNightsPerWeek: "",
    },
  });

  function onSubmit(data: InsertHotelInquiry) {
    mutation.mutate(data, {
      onSuccess: () => {
        form.reset();
        toast({
          title: "Inquiry submitted!",
          description: "Our partnerships team will reach out within 24 hours.",
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
    <div className="min-h-screen bg-secondary/30">
      <Navigation />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          
          {/* Left: Pitch Content */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-tight mb-4">
                Fill your gap nights with <span className="text-primary">high-quality guests</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Don't let rooms sit empty between bookings. GapNight connects you with spontaneous travelers looking for short stays, helping you maximize occupancy without degrading your brand value.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  title: "Maximize Revenue",
                  desc: "Turn empty nights into profit. Even a discounted room generates more than an empty one.",
                },
                {
                  title: "Discreet Distribution",
                  desc: "Offer deals to our private member network without publicizing discounts on OTAs.",
                },
                {
                  title: "Zero Risk",
                  desc: "You control the inventory. Only list the specific nights you need to fill.",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1 bg-primary/10 p-2 rounded-full h-fit">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Form Card */}
          <div className="relative">
            {/* Decorative background blob */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 to-purple-500/30 rounded-[2rem] blur-2xl opacity-50 z-0"></div>
            
            <Card className="relative z-10 border-border/50 shadow-xl backdrop-blur-sm bg-card">
              <CardHeader>
                <CardTitle className="font-display text-2xl">Partner with GapNight</CardTitle>
                <CardDescription>
                  Submit your details and our partnerships team will reach out within 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="hotelName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hotel Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="Grand Hotel Melbourne" className="pl-9 bg-background" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="Melbourne, VIC" className="pl-9 bg-background" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input type="email" placeholder="manager@hotel.com" className="pl-9 bg-background" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gapNightsPerWeek"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Gap Nights / Week</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select an estimate" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1-5">1-5 nights</SelectItem>
                              <SelectItem value="6-15">6-15 nights</SelectItem>
                              <SelectItem value="16-30">16-30 nights</SelectItem>
                              <SelectItem value="30+">30+ nights</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full text-lg font-bold h-12 shadow-lg shadow-primary/25 mt-4"
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? "Submitting..." : "Send Inquiry"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
