import { useRoute, Link } from "wouter";
import { useDeal } from "@/hooks/use-deals";
import { Navigation } from "@/components/Navigation";
import { 
  ArrowLeft, Star, MapPin, Calendar, Clock, 
  CheckCircle2, AlertCircle, Share2, Heart 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function DealDetail() {
  const [, params] = useRoute("/deal/:id");
  const id = params?.id || "";
  const { data: deal, isLoading } = useDeal(id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Navigation />
        <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8">
          <Skeleton className="w-full aspect-video rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold">Deal not found</h1>
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </div>
    );
  }

  const discountPercent = Math.round(
    ((deal.normalPrice - deal.dealPrice) / deal.normalPrice) * 100
  );

  return (
    <div className="min-h-screen bg-background pb-32">
      <Navigation />
      
      {/* Hero Image */}
      <div className="relative h-[50vh] sm:h-[60vh] w-full overflow-hidden">
        <img
          src={deal.imageUrl}
          alt={deal.hotelName}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-20 left-4 z-20">
          <Link href="/">
            <Button variant="secondary" size="icon" className="rounded-full bg-white/90 backdrop-blur shadow-lg" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
        </div>
        <div className="absolute top-20 right-4 z-20 flex gap-2">
          <Button variant="secondary" size="icon" className="rounded-full bg-white/90 backdrop-blur shadow-lg text-red-500 hover:text-red-600" data-testid="button-favorite">
            <Heart className="w-5 h-5" />
          </Button>
          <Button variant="secondary" size="icon" className="rounded-full bg-white/90 backdrop-blur shadow-lg" data-testid="button-share">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 -mt-10 relative z-20">
        <div className="bg-card rounded-3xl shadow-xl border border-border/50 p-6 sm:p-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                  {deal.roomType}
                </Badge>
                {deal.stars > 0 && (
                  <div className="flex">
                    {Array.from({ length: deal.stars }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2">
                {deal.hotelName}
              </h1>
              <div className="flex items-center text-muted-foreground">
                <MapPin className="w-4 h-4 mr-1.5" />
                {deal.location}
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end">
              <div className="text-sm text-muted-foreground line-through decoration-destructive/40">
                Regular price: {deal.currency} {deal.normalPrice}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-display font-bold text-primary">
                  {deal.currency} {deal.dealPrice}
                </span>
                <Badge className="bg-destructive text-destructive-foreground font-bold">
                  -{discountPercent}% OFF
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total for {deal.nights} night{deal.nights > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left Column: Details */}
            <div className="md:col-span-2 space-y-8">
              
              {/* Why Cheap Section */}
              <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 flex gap-4">
                <div className="bg-amber-100 p-2.5 rounded-full h-fit">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-900 mb-1">Why is this deal so cheap?</h3>
                  <p className="text-amber-800/80 text-sm leading-relaxed">
                    {deal.whyCheap}
                  </p>
                </div>
              </div>

              {/* Amenities / Tags */}
              <div>
                <h3 className="font-display font-bold text-lg mb-4">Highlights</h3>
                <div className="flex flex-wrap gap-2">
                  {deal.categoryTags.map((tag) => (
                    <div key={tag} className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      {tag}
                    </div>
                  ))}
                </div>
              </div>

              {/* Description Placeholder */}
              <div>
                <h3 className="font-display font-bold text-lg mb-3">About this stay</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Experience luxury at an unbeatable price. This {deal.roomType} offers stunning views, 
                  modern amenities, and is perfectly situated in the heart of {deal.location}. 
                  Ideal for spontaneous travelers looking for premium comfort without the premium price tag.
                </p>
              </div>

            </div>

            {/* Right Column: Sticky Sidebar Info */}
            <div className="space-y-6">
              <div className="bg-secondary/50 rounded-2xl p-5 border border-border/50 space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">Check-in</p>
                    <p className="text-muted-foreground text-sm">{deal.checkInDate}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">Check-out</p>
                    <p className="text-muted-foreground text-sm">{deal.checkOutDate}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">Duration</p>
                    <p className="text-muted-foreground text-sm">{deal.nights} Night{deal.nights > 1 ? "s" : ""}</p>
                  </div>
                </div>
              </div>

              <div className="bg-secondary/30 rounded-2xl p-5 border border-border/50">
                 <h4 className="font-bold text-sm mb-2">Cancellation Policy</h4>
                 <p className="text-sm text-muted-foreground">{deal.cancellation}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Bar for Mobile / Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 md:hidden z-50">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
             <div className="text-2xl font-bold font-display text-primary">
                {deal.currency} {deal.dealPrice}
             </div>
             <div className="text-xs text-muted-foreground">
                Total price
             </div>
          </div>
          <Button size="lg" className="rounded-xl px-8 font-bold shadow-lg shadow-primary/25">
            Request Booking
          </Button>
        </div>
      </div>

      {/* Desktop Floating Action */}
      <div className="hidden md:block fixed bottom-8 right-8 z-50">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="lg" className="h-14 rounded-full px-8 text-lg font-bold shadow-xl shadow-primary/30 hover:scale-105 transition-transform">
              Request Booking
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Secure this deal now!</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
