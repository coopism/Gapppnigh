import { useRoute, Link } from "wouter";
import { useDeal } from "@/hooks/use-deals";
import { Navigation } from "@/components/Navigation";
import { 
  ArrowLeft, Star, MapPin, CheckCircle2, Share2, Heart 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function DealDetail() {
  const [, params] = useRoute("/deal/:id");
  const id = params?.id || "";
  const { data: deal, isLoading } = useDeal(id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <Skeleton className="h-6 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="aspect-[4/3] rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
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
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="link-back">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to deals</span>
        </Link>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Left Column - Image */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden">
              <img
                src={deal.imageUrl}
                alt={deal.hotelName}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Action buttons on image */}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button 
                variant="secondary" 
                size="icon" 
                className="rounded-full bg-white/90 backdrop-blur shadow-lg"
                data-testid="button-share"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="secondary" 
                size="icon" 
                className="rounded-full bg-white/90 backdrop-blur shadow-lg text-red-500 hover:text-red-600"
                data-testid="button-favorite"
              >
                <Heart className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Right Column - Details */}
          <div>
            {/* Category Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {deal.categoryTags.map((tag) => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className="rounded-md border-foreground/20 text-xs font-semibold uppercase tracking-wider"
                >
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Hotel Name */}
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              {deal.hotelName}
            </h1>

            {/* Location + Rating */}
            <div className="flex items-center gap-4 text-muted-foreground mb-6">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>{deal.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-foreground">{deal.rating}</span>
                <span className="text-muted-foreground">({deal.reviewCount} reviews)</span>
              </div>
            </div>

            {/* Why is this cheap? */}
            <div className="bg-white rounded-xl p-5 border border-border/50 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-bold text-foreground mb-1">Why is this cheap?</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {deal.whyCheap}
                  </p>
                </div>
              </div>
            </div>

            {/* Price Card */}
            <div className="bg-white rounded-xl p-5 border border-border/50">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-sm text-muted-foreground line-through mb-1">
                    Normal price: {deal.currency}{deal.normalPrice}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-foreground">
                      {deal.currency}{deal.dealPrice}
                    </span>
                    <span className="text-lg font-semibold text-primary">
                      (-{discountPercent}%)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="rounded-md border-primary/30 text-primary font-semibold mb-1">
                    {deal.checkInDate}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    {deal.nights} Night Stay
                  </div>
                </div>
              </div>

              <Button className="w-full h-12 text-base font-semibold rounded-xl mb-3" data-testid="button-request-booking">
                Request Booking
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Free cancellation: <span className="font-semibold text-foreground">{deal.cancellation}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - About & Location */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* About this room */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">About this room</h2>
            <div className="bg-white rounded-xl p-5 border border-border/50">
              <h3 className="font-bold text-foreground mb-2">{deal.roomType}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Experience luxury in this spacious room featuring modern amenities and 
                stunning views. Perfect for a short gap-night stay, this room offers 
                everything you need for a comfortable and memorable experience. 
                Enjoy premium bedding, high-speed WiFi, and access to hotel facilities.
              </p>
            </div>
          </div>

          {/* Location */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Location</h2>
            <div className="bg-white rounded-xl p-5 border border-border/50 h-[200px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{deal.location}</p>
                <p className="text-xs mt-1">Map coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
