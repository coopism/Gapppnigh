import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, Plus, LogOut, Star, MapPin, Calendar, 
  LayoutDashboard, Settings, AlertTriangle 
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { HotelProfile } from "@shared/schema";

export default function OwnerDashboard() {
  const { owner, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/owner/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const { data: hotels, isLoading: hotelsLoading } = useQuery<HotelProfile[]>({
    queryKey: ["/api/owner/hotels"],
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const activeHotels = hotels?.filter(h => h.isActive) || [];
  const inactiveHotels = hotels?.filter(h => !h.isActive) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/owner/dashboard" className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">GapNight</span>
            </Link>
            <Badge variant="secondary">Hotel Owner Portal</Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {owner?.email}
            </span>
            <ThemeToggle />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => logout()}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Hotels</h1>
            <p className="text-muted-foreground mt-1">
              Manage your properties and gap night deals
            </p>
          </div>
          
          <Link href="/owner/hotels/new">
            <Button data-testid="button-add-hotel">
              <Plus className="h-4 w-4 mr-2" />
              Add Hotel
            </Button>
          </Link>
        </div>

        {hotelsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : activeHotels.length === 0 ? (
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>No Hotels Yet</CardTitle>
              <CardDescription>
                Get started by adding your first hotel to the platform
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Link href="/owner/hotels/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Hotel
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeHotels.map(hotel => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        )}

        {inactiveHotels.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4 text-muted-foreground">
              Inactive Hotels
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
              {inactiveHotels.map(hotel => (
                <HotelCard key={hotel.id} hotel={hotel} inactive />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function HotelCard({ hotel, inactive }: { hotel: HotelProfile; inactive?: boolean }) {
  const coverImage = hotel.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400";
  
  return (
    <Card className="overflow-hidden" data-testid={`card-hotel-${hotel.id}`}>
      <div 
        className="h-40 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${coverImage})` }}
      >
        {inactive && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Badge variant="secondary">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Inactive
            </Badge>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge className="bg-background/80 text-foreground">
            <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />
            {hotel.starRating} Star
          </Badge>
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{hotel.name}</CardTitle>
        {hotel.chainName && (
          <p className="text-sm text-muted-foreground">{hotel.chainName}</p>
        )}
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {hotel.city}, {hotel.state || hotel.country}
        </div>
      </CardContent>
      
      <CardFooter className="gap-2 flex-wrap">
        <Link href={`/owner/hotels/${hotel.id}`}>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1" />
            Manage
          </Button>
        </Link>
        <Link href={`/owner/hotels/${hotel.id}/deals`}>
          <Button size="sm">
            <Calendar className="h-4 w-4 mr-1" />
            Gap Nights
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
