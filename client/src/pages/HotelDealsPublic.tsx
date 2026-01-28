import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MapPin, Calendar, ChevronRight, ArrowLeft } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { HotelProfile, PublishedDeal, RoomTypeRecord } from "@shared/schema";

interface HotelWithDeals {
  hotel: HotelProfile;
  minPrice: number;
  maxDiscount: number;
  nextAvailableDate: string;
  dealDateCount: number;
  coverImage: string;
}

export default function HotelDealsPublic() {
  const { data: hotelsWithDeals, isLoading } = useQuery<HotelWithDeals[]>({
    queryKey: ["/api/public/deals"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8" data-testid="page-gap-night-deals">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" data-testid="heading-deals-title">Gap Night Deals</h1>
          <p className="text-muted-foreground mt-2" data-testid="text-deals-description">
            Browse hotels with discounted orphan nights available
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : !hotelsWithDeals || hotelsWithDeals.length === 0 ? (
          <Card className="max-w-lg mx-auto" data-testid="card-no-deals">
            <CardHeader className="text-center">
              <CardTitle>No Deals Available</CardTitle>
              <CardDescription>
                Check back soon for gap night deals from our partner hotels.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="grid-hotel-deals">
            {hotelsWithDeals.map(item => (
              <HotelDealCard key={item.hotel.id} item={item} />
            ))}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}

function HotelDealCard({ item }: { item: HotelWithDeals }) {
  const { hotel, minPrice, maxDiscount, nextAvailableDate, dealDateCount, coverImage } = item;
  
  return (
    <Link href={`/hotels/${hotel.id}/deals`} data-testid={`link-hotel-deal-${hotel.id}`}>
      <div className="overflow-visible hover-elevate transition-all rounded-lg">
        <Card className="overflow-hidden cursor-pointer" data-testid={`card-hotel-deal-${hotel.id}`}>
          <div 
            className="h-48 bg-cover bg-center relative"
            style={{ backgroundImage: `url(${coverImage})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 text-white">
              <div className="flex items-center gap-1 mb-1">
                {Array.from({ length: hotel.starRating }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <h3 className="font-semibold text-lg leading-tight" data-testid={`text-hotel-name-${hotel.id}`}>{hotel.name}</h3>
            </div>
            <div className="absolute top-3 right-3">
              <Badge className="bg-green-500 text-white" data-testid={`badge-discount-${hotel.id}`}>
                Up to {maxDiscount}% off
              </Badge>
            </div>
          </div>
          
          <CardContent className="p-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3" data-testid={`text-location-${hotel.id}`}>
              <MapPin className="h-4 w-4" />
              {hotel.city}, {hotel.state || hotel.country}
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm text-muted-foreground">From</div>
                <div className="text-xl font-bold text-green-600" data-testid={`text-price-${hotel.id}`}>A${minPrice}</div>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span data-testid={`text-deal-count-${hotel.id}`}>{dealDateCount} dates available</span>
                </div>
                {nextAvailableDate && (
                  <div className="text-sm" data-testid={`text-next-date-${hotel.id}`}>
                    Next: {format(parseISO(nextAvailableDate), "MMM d")}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="border-t p-4">
            <Button className="w-full" variant="outline" data-testid={`button-view-deals-${hotel.id}`}>
              View Deal Dates
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Link>
  );
}

export function HotelDealDetail() {
  const [, params] = useRoute("/hotels/:hotelId/deals");
  const hotelId = params?.hotelId;

  const { data: hotelData, isLoading: hotelLoading } = useQuery<HotelProfile & { roomTypes: RoomTypeRecord[] }>({
    queryKey: ["/api/public/hotels", hotelId],
    enabled: !!hotelId,
  });

  const { data: deals, isLoading: dealsLoading } = useQuery<PublishedDeal[]>({
    queryKey: ["/api/public/hotels", hotelId, "deal-dates"],
    enabled: !!hotelId,
  });

  if (hotelLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!hotelData) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto" data-testid="card-hotel-not-found">
            <CardHeader>
              <CardTitle>Hotel Not Found</CardTitle>
            </CardHeader>
            <CardFooter>
              <Link href="/gap-night-deals">
                <Button data-testid="button-back-to-deals">Back to Deals</Button>
              </Link>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  const coverImage = hotelData.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800";
  const publishedDeals = deals?.filter(d => d.status === "PUBLISHED") || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8" data-testid="page-hotel-deal-detail">
        <Link href="/gap-night-deals">
          <Button variant="ghost" className="mb-6" data-testid="button-back-link">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to All Deals
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div 
              className="h-64 md:h-80 rounded-lg bg-cover bg-center relative mb-6"
              style={{ backgroundImage: `url(${coverImage})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-lg" />
              <div className="absolute bottom-4 left-4 text-white">
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: hotelData.starRating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold" data-testid="heading-hotel-name">{hotelData.name}</h1>
                <p className="flex items-center gap-1 opacity-90" data-testid="text-hotel-location">
                  <MapPin className="h-4 w-4" />
                  {hotelData.city}, {hotelData.state || hotelData.country}
                </p>
              </div>
            </div>

            {hotelData.description && (
              <p className="text-muted-foreground mb-6" data-testid="text-hotel-description">{hotelData.description}</p>
            )}

            {hotelData.amenities && hotelData.amenities.length > 0 && (
              <div className="mb-6" data-testid="section-amenities">
                <h3 className="font-semibold mb-3">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {hotelData.amenities.map((amenity, i) => (
                    <Badge key={i} variant="secondary" data-testid={`badge-amenity-${i}`}>{amenity}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <Card data-testid="card-deal-dates">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Available Deal Dates
                </CardTitle>
                <CardDescription data-testid="text-deal-count">
                  {publishedDeals.length} gap night{publishedDeals.length !== 1 ? "s" : ""} available
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dealsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : publishedDeals.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4" data-testid="text-no-deals">
                    No deals currently available for this hotel.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {publishedDeals.map(deal => (
                      <Card 
                        key={deal.id}
                        className="p-3"
                        data-testid={`card-deal-date-${deal.id}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-medium" data-testid={`text-deal-date-${deal.id}`}>
                              {format(parseISO(deal.date), "EEE, MMM d, yyyy")}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              1 night stay
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600" data-testid={`text-deal-price-${deal.id}`}>
                              A${deal.dealPrice}
                            </div>
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-deal-discount-${deal.id}`}>
                              -{deal.discountPercent}% off
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
              {publishedDeals.length > 0 && (
                <CardFooter>
                  <Button className="w-full" data-testid="button-request-book">
                    Request to Book
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
