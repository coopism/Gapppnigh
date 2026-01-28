import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2, Building2, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";

const AMENITY_OPTIONS = [
  "WiFi", "Pool", "Gym", "Spa", "Restaurant", "Bar", 
  "Parking", "Room Service", "Concierge", "Beach Access",
  "Business Center", "Pet Friendly"
];

export default function HotelNew() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: "",
    chainName: "",
    description: "",
    address: "",
    city: "",
    state: "",
    country: "Australia",
    starRating: 3,
    contactEmail: "",
    amenities: [] as string[],
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/owner/hotels", data);
      return response.json();
    },
    onSuccess: (hotel) => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/hotels"] });
      toast({ title: "Hotel created successfully!" });
      setLocation(`/owner/hotels/${hotel.id}`);
    },
    onError: (err: any) => {
      setError(err?.message || "Failed to create hotel");
    },
  });

  if (!isAuthenticated) {
    setLocation("/owner/login");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.name || !formData.city) {
      setError("Hotel name and city are required");
      return;
    }
    
    await createMutation.mutateAsync(formData);
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/owner/dashboard" className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">GapNight</span>
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/owner/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Add New Hotel</CardTitle>
            <CardDescription>
              Enter your hotel details to get started
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {error && (
                <div className="bg-destructive/10 text-destructive rounded-md p-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Hotel Name *</Label>
                  <Input
                    id="name"
                    placeholder="Crown City Suites"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    data-testid="input-hotel-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="chainName">Chain/Group Name</Label>
                  <Input
                    id="chainName"
                    placeholder="Crown Collection"
                    value={formData.chainName}
                    onChange={(e) => setFormData(prev => ({ ...prev, chainName: e.target.value }))}
                    data-testid="input-chain-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your hotel..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  data-testid="input-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="123 Main Street"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  data-testid="input-address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="Melbourne"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    required
                    data-testid="input-city"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    placeholder="VIC"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    data-testid="input-state"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    data-testid="input-country"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="starRating">Star Rating</Label>
                  <Select
                    value={String(formData.starRating)}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, starRating: parseInt(val) }))}
                  >
                    <SelectTrigger data-testid="select-star-rating">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(n => (
                        <SelectItem key={n} value={String(n)}>{n} Star</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="bookings@hotel.com"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                    data-testid="input-contact-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amenities</Label>
                <div className="flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map(amenity => (
                    <Button
                      key={amenity}
                      type="button"
                      variant={formData.amenities.includes(amenity) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleAmenity(amenity)}
                      data-testid={`button-amenity-${amenity.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {amenity}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full"
                disabled={createMutation.isPending}
                data-testid="button-create-hotel"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Hotel...
                  </>
                ) : (
                  "Create Hotel"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
