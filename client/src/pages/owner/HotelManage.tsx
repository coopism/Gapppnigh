import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle, Loader2, Building2, ArrowLeft, Save, Trash2, Plus, Star, MapPin } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import type { HotelProfile, RoomTypeRecord } from "@shared/schema";

const AMENITY_OPTIONS = [
  "WiFi", "Pool", "Gym", "Spa", "Restaurant", "Bar", 
  "Parking", "Room Service", "Concierge", "Beach Access",
  "Business Center", "Pet Friendly"
];

export default function HotelManage() {
  const [, params] = useRoute("/owner/hotels/:hotelId");
  const hotelId = params?.hotelId;
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: hotel, isLoading } = useQuery<HotelProfile>({
    queryKey: ["/api/owner/hotels", hotelId],
    enabled: !!hotelId && isAuthenticated,
  });

  const { data: roomTypes, isLoading: roomTypesLoading } = useQuery<RoomTypeRecord[]>({
    queryKey: ["/api/owner/hotels", hotelId, "room-types"],
    enabled: !!hotelId && isAuthenticated,
  });

  if (!isAuthenticated) {
    setLocation("/owner/login");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Hotel Not Found</CardTitle>
            <CardDescription>The hotel you're looking for doesn't exist or you don't have access.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/owner/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

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

      <main className="container mx-auto px-4 py-8">
        <Link href="/owner/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {hotel.name}
              <Badge variant="outline">
                <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />
                {hotel.starRating} Star
              </Badge>
            </h1>
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" />
              {hotel.city}, {hotel.state || hotel.country}
            </p>
          </div>
          
          <Link href={`/owner/hotels/${hotelId}/deals`}>
            <Button>Manage Gap Nights</Button>
          </Link>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="room-types">Room Types</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <ProfileTab hotel={hotel} hotelId={hotelId!} />
          </TabsContent>
          
          <TabsContent value="room-types">
            <RoomTypesTab hotelId={hotelId!} roomTypes={roomTypes || []} isLoading={roomTypesLoading} />
          </TabsContent>
          
          <TabsContent value="danger">
            <DangerZoneTab hotel={hotel} hotelId={hotelId!} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ProfileTab({ hotel, hotelId }: { hotel: HotelProfile; hotelId: string }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: hotel.name,
    chainName: hotel.chainName || "",
    description: hotel.description || "",
    address: hotel.address || "",
    city: hotel.city,
    state: hotel.state || "",
    country: hotel.country,
    starRating: hotel.starRating,
    contactEmail: hotel.contactEmail || "",
    amenities: hotel.amenities || [],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("PUT", `/api/owner/hotels/${hotelId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/hotels", hotelId] });
      toast({ title: "Hotel updated successfully!" });
    },
  });

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hotel Profile</CardTitle>
        <CardDescription>Update your hotel's public information</CardDescription>
      </CardHeader>
      <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(formData); }}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Hotel Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chainName">Chain Name</Label>
              <Input
                id="chainName"
                value={formData.chainName}
                onChange={(e) => setFormData(prev => ({ ...prev, chainName: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Star Rating</Label>
              <Select
                value={String(formData.starRating)}
                onValueChange={(val) => setFormData(prev => ({ ...prev, starRating: parseInt(val) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} Star</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                >
                  {amenity}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function RoomTypesTab({ hotelId, roomTypes, isLoading }: { hotelId: string; roomTypes: RoomTypeRecord[]; isLoading: boolean }) {
  const { toast } = useToast();
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomInventory, setNewRoomInventory] = useState(1);

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/owner/hotels/${hotelId}/room-types`, {
        name: newRoomName,
        inventory: newRoomInventory,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/hotels", hotelId, "room-types"] });
      setNewRoomName("");
      setNewRoomInventory(1);
      toast({ title: "Room type added!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (roomTypeId: string) => {
      await apiRequest("DELETE", `/api/owner/room-types/${roomTypeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/hotels", hotelId, "room-types"] });
      toast({ title: "Room type removed" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Room Types</CardTitle>
        <CardDescription>Manage the room types available at this hotel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <Label>Room Type Name</Label>
            <Input
              placeholder="King Room"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              data-testid="input-new-room-name"
            />
          </div>
          <div className="w-32 space-y-2">
            <Label>Inventory</Label>
            <Input
              type="number"
              min={1}
              value={newRoomInventory}
              onChange={(e) => setNewRoomInventory(parseInt(e.target.value) || 1)}
              data-testid="input-new-room-inventory"
            />
          </div>
          <Button 
            onClick={() => createMutation.mutate()}
            disabled={!newRoomName || createMutation.isPending}
            data-testid="button-add-room-type"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading room types...</div>
        ) : roomTypes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No room types yet. Add your first room type above.
          </div>
        ) : (
          <div className="space-y-2">
            {roomTypes.map(rt => (
              <div key={rt.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`room-type-${rt.id}`}>
                <div>
                  <span className="font-medium">{rt.name}</span>
                  <span className="text-muted-foreground ml-2">({rt.inventory} rooms)</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(rt.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DangerZoneTab({ hotel, hotelId }: { hotel: HotelProfile; hotelId: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/owner/hotels/${hotelId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/hotels"] });
      toast({ title: "Hotel removed from platform" });
      setLocation("/owner/dashboard");
    },
  });

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
        <CardDescription>Irreversible actions for this hotel</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg">
          <div>
            <h3 className="font-medium">Remove Hotel</h3>
            <p className="text-sm text-muted-foreground">
              This will hide your hotel from the platform and unpublish all deals.
            </p>
          </div>
          
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" data-testid="button-remove-hotel">
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Hotel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                  This will remove "{hotel.name}" from the platform and unpublish all its deals.
                  You can contact support to reactivate it later.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => deactivateMutation.mutate()}
                  disabled={deactivateMutation.isPending}
                >
                  {deactivateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Yes, Remove Hotel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
