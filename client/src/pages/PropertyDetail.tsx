import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import {
  Star, MapPin, Bed, Users, Wifi, Dumbbell, Car, UtensilsCrossed, Waves,
  Sparkles, Wine, Umbrella, Bell, ConciergeBell, Heart, Shield, Clock,
  MessageCircle, ChevronLeft, Calendar, Home, Check,
} from "lucide-react";

const AMENITY_ICONS: Record<string, typeof Wifi> = {
  "WiFi": Wifi, "Gym": Dumbbell, "Parking": Car, "Restaurant": UtensilsCrossed,
  "Pool": Waves, "Spa": Sparkles, "Bar": Wine, "Beach Access": Umbrella,
  "Room Service": Bell, "Concierge": ConciergeBell, "Kitchen": UtensilsCrossed,
  "Air Conditioning": Sparkles, "Heating": Sparkles, "Washer": Sparkles,
  "Dryer": Sparkles, "TV": Sparkles, "Garden": Sparkles, "BBQ": Sparkles,
  "Elevator": Sparkles, "Balcony": Sparkles,
};

export default function PropertyDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [property, setProperty] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [qa, setQa] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(0);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/properties/${params.id}`)
        .then(r => {
          if (!r.ok) throw new Error("Not found");
          return r.json();
        })
        .then(data => {
          setProperty(data.property);
          setPhotos(data.photos || []);
          setAvailability(data.availability || []);
          setQa(data.qa || []);
          setReviews(data.reviews || []);
        })
        .catch(() => setProperty(null))
        .finally(() => setIsLoading(false));
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">Property not found</h2>
          <p className="text-muted-foreground mb-6">This property may have been removed or is no longer available.</p>
          <Button onClick={() => setLocation("/deals")}>Browse Deals</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const gapNights = availability.filter((a: any) => a.isGapNight && a.isAvailable);
  const lowestGapRate = gapNights.length > 0
    ? Math.min(...gapNights.map((gn: any) => Math.round(gn.nightlyRate * (1 - (gn.gapNightDiscount || 0) / 100))))
    : null;
  const maxDiscount = gapNights.length > 0
    ? Math.max(...gapNights.map((gn: any) => gn.gapNightDiscount || 0))
    : 0;

  const allImages = [
    property.coverImage,
    ...(property.images || []),
    ...photos.map((p: any) => p.url),
  ].filter(Boolean).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

  if (allImages.length === 0) {
    allImages.push("https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop");
  }

  const propertyTypeLabel = property.propertyType === "entire_place" ? "Entire place"
    : property.propertyType === "private_room" ? "Private room"
    : property.propertyType === "shared_room" ? "Shared room" : "Unique stay";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Back button */}
        <button onClick={() => setLocation("/deals")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to deals
        </button>

        {/* Title section */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{property.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
              {Number(property.averageRating) > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-foreground">{property.averageRating}</span>
                  ({property.totalReviews || 0} reviews)
                </span>
              )}
              {property.host?.isSuperhost && (
                <Badge variant="secondary" className="font-medium">Superhost</Badge>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {property.city}, {property.state}
              </span>
            </div>
          </div>
          {maxDiscount > 0 && (
            <Badge className="bg-amber-500 text-white font-bold text-base px-4 py-2 shrink-0">
              Up to {maxDiscount}% OFF
            </Badge>
          )}
        </div>

        {/* Image gallery */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-8 rounded-2xl overflow-hidden">
          <div className="aspect-[4/3] md:aspect-auto md:row-span-2">
            <img
              src={allImages[selectedPhoto] || allImages[0]}
              alt={property.title}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setSelectedPhoto((selectedPhoto + 1) % allImages.length)}
              onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop'; }}
            />
          </div>
          {allImages.length > 1 && (
            <div className="grid grid-cols-2 gap-2">
              {allImages.slice(1, 5).map((img: string, idx: number) => (
                <img
                  key={idx}
                  src={img}
                  alt={`${property.title} ${idx + 2}`}
                  className="w-full h-full object-cover aspect-[4/3] cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedPhoto(idx + 1)}
                  onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop'; }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Host + property info */}
            <div className="flex items-center justify-between border-b pb-6">
              <div>
                <h2 className="text-xl font-semibold">
                  {propertyTypeLabel} hosted by {property.host?.name || "Host"}
                </h2>
                <p className="text-muted-foreground mt-1">
                  {property.maxGuests} guest{property.maxGuests !== 1 ? "s" : ""}
                  {" · "}{property.bedrooms} bedroom{property.bedrooms !== 1 ? "s" : ""}
                  {" · "}{property.beds} bed{property.beds !== 1 ? "s" : ""}
                  {" · "}{property.bathrooms} bath{Number(property.bathrooms) !== 1 ? "s" : ""}
                </p>
              </div>
              {property.host?.profilePhoto ? (
                <img src={property.host.profilePhoto} alt={property.host.name} className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {(property.host?.name || "H").charAt(0)}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold mb-3">About this place</h3>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{property.description}</p>
            </div>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">What this place offers</h3>
                <div className="grid grid-cols-2 gap-3">
                  {property.amenities.map((amenity: string) => {
                    const Icon = AMENITY_ICONS[amenity] || Check;
                    return (
                      <div key={amenity} className="flex items-center gap-3 text-sm">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                        <span>{amenity}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* House rules */}
            {property.houseRules && (
              <div>
                <h3 className="text-lg font-semibold mb-3">House rules</h3>
                <p className="text-muted-foreground text-sm whitespace-pre-line">{property.houseRules}</p>
                <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                  <span>Check-in: {property.checkInTime || "15:00"}</span>
                  <span>Checkout: {property.checkOutTime || "10:00"}</span>
                </div>
              </div>
            )}

            {/* Gap Night Availability */}
            {gapNights.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Gap Night Availability
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  These dates are available at a discount between existing bookings.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {gapNights.slice(0, 12).map((gn: any) => {
                    const discounted = Math.round(gn.nightlyRate * (1 - (gn.gapNightDiscount || 0) / 100));
                    return (
                      <div key={gn.id} className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                        <div className="font-semibold text-sm">{gn.date}</div>
                        <div className="text-xs line-through text-muted-foreground">{formatPrice(gn.nightlyRate / 100, "AUD")}</div>
                        <div className="font-bold text-primary">{formatPrice(discounted / 100, "AUD")}</div>
                        <Badge className="bg-primary/10 text-primary text-[10px] mt-1">-{gn.gapNightDiscount}%</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Q&A */}
            {qa.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Questions & Answers
                </h3>
                <div className="space-y-4">
                  {qa.filter((q: any) => q.isPublic).map((q: any) => (
                    <div key={q.id} className="border rounded-lg p-4">
                      <p className="font-medium text-sm">Q: {q.question}</p>
                      {q.answer ? (
                        <p className="text-sm text-muted-foreground mt-2">A: {q.answer}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-2 italic">Awaiting host response</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Reviews ({reviews.length})
                </h3>
                <div className="space-y-4">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`w-4 h-4 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm">{r.comment}</p>
                      {r.hostResponse && (
                        <div className="mt-3 pl-4 border-l-2 border-primary/30">
                          <p className="text-xs font-medium text-primary">Host response:</p>
                          <p className="text-sm text-muted-foreground">{r.hostResponse}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column - Booking card */}
          <div>
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <div className="flex items-baseline gap-2 mb-4">
                  {lowestGapRate ? (
                    <>
                      <span className="text-sm line-through text-muted-foreground">
                        {formatPrice(property.baseNightlyRate / 100, "AUD")}
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {formatPrice(lowestGapRate / 100, "AUD")}
                      </span>
                      <span className="text-muted-foreground">/night</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-bold">
                        {formatPrice(property.baseNightlyRate / 100, "AUD")}
                      </span>
                      <span className="text-muted-foreground">/night</span>
                    </>
                  )}
                </div>

                {gapNights.length > 0 && (
                  <div className="bg-primary/5 rounded-lg p-3 mb-4 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary fill-primary" />
                    <span className="text-sm font-medium text-primary">
                      {gapNights.length} gap night{gapNights.length !== 1 ? "s" : ""} available
                    </span>
                  </div>
                )}

                {property.cleaningFee > 0 && (
                  <p className="text-sm text-muted-foreground mb-2">
                    + {formatPrice(property.cleaningFee / 100, "AUD")} cleaning fee
                  </p>
                )}

                <div className="text-sm text-muted-foreground space-y-1 mb-4">
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Min {property.minNights} night{property.minNights !== 1 ? "s" : ""}
                  </p>
                  <p className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    ID verification required
                  </p>
                  <p className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Host approval within 24h
                  </p>
                </div>

                <Button className="w-full mb-3" size="lg"
                  onClick={() => {
                    toast({
                      title: "Booking coming soon",
                      description: "Full booking flow with Stripe ID verification is available via the API. Frontend booking page is coming soon!",
                    });
                  }}>
                  Request to Book
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  You won't be charged yet. The host will review your request.
                </p>

                {/* Host info */}
                {property.host && (
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {property.host.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{property.host.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {property.host.isSuperhost && "Superhost · "}
                          Responds in ~{property.host.averageResponseTime < 60
                            ? `${property.host.averageResponseTime}min`
                            : `${Math.round(property.host.averageResponseTime / 60)}hr`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
