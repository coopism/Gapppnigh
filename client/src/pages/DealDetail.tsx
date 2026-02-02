import { useRoute, Link, useLocation } from "wouter";
import { useDeal, useHotelAvailability } from "@/hooks/use-deals";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { 
  ArrowLeft, Star, MapPin, Share2, Heart, Wifi, Dumbbell, Car, UtensilsCrossed, Waves, Sparkles, Navigation as NavIcon, Calendar, Check, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { formatPrice } from "@/lib/utils";
import { GapNightLogoLoader } from "@/components/GapNightLogo";


const AMENITY_ICONS: Record<string, typeof Wifi> = {
  "WiFi": Wifi,
  "Gym": Dumbbell,
  "Parking": Car,
  "Restaurant": UtensilsCrossed,
  "Pool": Waves,
  "Spa": Sparkles,
  "Bar": UtensilsCrossed,
  "Beach Access": Waves,
  "Room Service": UtensilsCrossed,
  "Concierge": Star,
};

function DealMap({ latitude, longitude, hotelName }: { latitude: number; longitude: number; hotelName: string }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!mapContainer.current) return;
    
    const map = L.map(mapContainer.current, {
      attributionControl: false,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    }).setView([latitude, longitude], 14);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);
    
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `
        <svg width="40" height="40" viewBox="0 0 24 24" fill="#0ea5a5" stroke="white" stroke-width="1.5" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="white"></circle>
        </svg>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });
    
    L.marker([latitude, longitude], { icon }).addTo(map);
    
    return () => {
      map.remove();
    };
  }, [latitude, longitude]);
  
  return (
    <div 
      ref={mapContainer} 
      className="bg-card rounded-xl overflow-hidden border border-border/50 h-[250px]"
    />
  );
}

export default function DealDetail() {
  const [, params] = useRoute("/deal/:id");
  const [, setLocation] = useLocation();
  const id = params?.id || "";
  const { data: deal, isLoading } = useDeal(id);
  const { data: hotelDeals } = useHotelAvailability(deal?.hotelName || "");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Auto-select current deal when data loads
  useEffect(() => {
    if (deal && !selectedOption) {
      setSelectedOption(deal.id);
    }
  }, [deal, selectedOption]);
  
  const handleBooking = () => {
    if (selectedOption) {
      setLocation(`/booking/${selectedOption}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col items-center justify-center min-h-[60vh]">
          <GapNightLogoLoader size={64} className="mb-4" />
          <p className="text-muted-foreground text-sm animate-pulse">Loading deal...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navigation />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md mx-auto px-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Deal not found</h1>
              <p className="text-muted-foreground">
                Sorry, we couldn't find the deal you're looking for. It may have expired or been removed.
              </p>
            </div>
            <Link href="/deals">
              <Button size="lg" className="w-full" data-testid="button-back-to-deals">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Deals
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const discountPercent = Math.round(
    ((deal.normalPrice - deal.dealPrice) / deal.normalPrice) * 100
  );

  // Filter to only deals for this exact hotel
  const availabilityOptions = (hotelDeals || []).filter(
    d => d.hotelName === deal.hotelName
  );

  const formatDateRange = (checkInDate: string, checkOutDate: string) => {
    const checkIn = parseISO(checkInDate);
    const checkOut = parseISO(checkOutDate);
    return `${format(checkIn, 'MMM d')} - ${format(checkOut, 'MMM d')}`;
  };

  const selectedAvailability = availabilityOptions.find(opt => opt.id === selectedOption);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Back Link */}
        <Link href="/deals" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="link-back">
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
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop';
                }}
              />
            </div>
            {/* Action buttons on image */}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button 
                variant="secondary" 
                size="icon" 
                className="rounded-full bg-card/90 backdrop-blur shadow-lg"
                data-testid="button-share"
                aria-label="Share this deal"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="secondary" 
                size="icon" 
                className="rounded-full bg-card/90 backdrop-blur shadow-lg text-destructive"
                data-testid="button-favorite"
                aria-label="Add to favorites"
              >
                <Heart className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Discount badge */}
            <div className="absolute top-4 left-4">
              <Badge className="bg-amber-500 text-white font-bold shadow-lg px-3 py-1.5 text-sm">
                {discountPercent}% OFF
              </Badge>
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

            {/* Availability Selector - Clean Compact Design */}
            <div className="bg-card rounded-xl border border-border/50 mb-6 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground text-sm">Available Gap Nights</h3>
                </div>
              </div>
              
              <div className="p-2">
                {availabilityOptions.length > 0 ? (
                  availabilityOptions.map((option) => {
                    const isSelected = selectedOption === option.id;
                    const optionDiscount = Math.round(((option.normalPrice - option.dealPrice) / option.normalPrice) * 100);
                    
                    return (
                      <button
                        key={option.id}
                        onClick={() => setSelectedOption(option.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all mb-1 last:mb-0 hover-elevate ${
                          isSelected 
                            ? 'bg-primary/10 border-2 border-primary' 
                            : 'bg-background border-2 border-transparent'
                        }`}
                        data-testid={`availability-option-${option.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-foreground text-sm">
                              {formatDateRange(option.checkInDate, option.checkOutDate)}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              {option.nights} night{option.nights > 1 ? 's' : ''} · {option.roomType}
                              <span className="mx-1">·</span>
                              <Users className="w-3 h-3" />
                              <span>{option.maxGuests || 2}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-xs line-through text-muted-foreground">
                              {formatPrice(option.normalPrice, option.currency)}
                            </span>
                            <span className="font-bold text-primary">
                              {formatPrice(option.dealPrice, option.currency)}
                            </span>
                          </div>
                          <div className="text-xs text-primary font-medium">
                            {optionDiscount}% off
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Loading availability...
                  </div>
                )}
              </div>
            </div>

            {/* Book Now Section */}
            <div className="bg-card rounded-xl p-5 border border-border/50">
              {selectedAvailability ? (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">
                        {formatDateRange(selectedAvailability.checkInDate, selectedAvailability.checkOutDate)} · {selectedAvailability.nights} night{selectedAvailability.nights > 1 ? 's' : ''}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-foreground">
                          {formatPrice(selectedAvailability.dealPrice * selectedAvailability.nights, selectedAvailability.currency)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(selectedAvailability.normalPrice * selectedAvailability.nights, selectedAvailability.currency)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatPrice(selectedAvailability.dealPrice, selectedAvailability.currency)}/night
                      </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      Selected
                    </Badge>
                  </div>
                  <Button 
                    className="w-full h-12 text-base font-semibold rounded-xl" 
                    onClick={handleBooking}
                    data-testid="button-request-booking"
                  >
                    Request Booking
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm mb-4">
                    Select an available date above to continue
                  </p>
                  <Button disabled className="w-full h-12 text-base font-semibold rounded-xl" data-testid="button-request-booking-disabled">
                    Select Dates to Book
                  </Button>
                </div>
              )}

              <div className="text-center text-sm text-muted-foreground mt-3">
                {deal.cancellation}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - About & Location */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* About this room */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">About this room</h2>
              <div className="bg-card rounded-xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-foreground">{selectedAvailability?.roomType || deal.roomType}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                    <Users className="w-4 h-4" />
                    <span>Sleeps {(selectedAvailability?.maxGuests || deal.maxGuests) || 2}</span>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  Experience luxury in this spacious room featuring modern amenities and 
                  stunning views. Perfect for a short gap-night stay, this room offers 
                  everything you need for a comfortable and memorable experience.
                </p>
                
                {(selectedAvailability?.nearbyHighlight || deal.nearbyHighlight) && (
                  <div className="flex items-center gap-2 text-primary text-sm mb-4 p-3 bg-primary/10 rounded-lg">
                    <NavIcon className="w-4 h-4 shrink-0" />
                    <span className="font-medium">{selectedAvailability?.nearbyHighlight || deal.nearbyHighlight}</span>
                  </div>
                )}

                {((selectedAvailability?.amenities || deal.amenities) && (selectedAvailability?.amenities || deal.amenities)!.length > 0) && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Amenities</h4>
                    <div className="flex flex-wrap gap-3">
                      {(selectedAvailability?.amenities || deal.amenities || []).map((amenity) => {
                        const Icon = AMENITY_ICONS[amenity];
                        return (
                          <div key={amenity} className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-lg">
                            {Icon && <Icon className="w-4 h-4" />}
                            <span>{amenity}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Location</h2>
            {deal.latitude && deal.longitude ? (
              <DealMap latitude={parseFloat(deal.latitude)} longitude={parseFloat(deal.longitude)} hotelName={deal.hotelName} />
            ) : (
              <div className="bg-card rounded-xl p-5 border border-border/50 h-[200px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{deal.location}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
