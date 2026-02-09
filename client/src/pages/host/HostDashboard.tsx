import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function HostDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [host, setHost] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/host/me", { credentials: "include" });
      if (!res.ok) {
        setLocation("/host/login");
        return;
      }
      const data = await res.json();
      setHost(data.host);
    } catch {
      setLocation("/host/login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/host/logout", { method: "POST", credentials: "include" });
    setLocation("/host/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!host) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">
              Gap<span className="text-emerald-500">Night</span>
              <span className="text-sm font-normal text-muted-foreground ml-2">Host Dashboard</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {host.name} {host.isSuperhost && <Badge variant="secondary" className="ml-1">Superhost</Badge>}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="qa">Q&A</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="properties"><PropertiesTab /></TabsContent>
          <TabsContent value="bookings"><BookingsTab /></TabsContent>
          <TabsContent value="availability"><AvailabilityTab /></TabsContent>
          <TabsContent value="qa"><QATab /></TabsContent>
          <TabsContent value="profile"><ProfileTab host={host} onUpdate={checkAuth} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/host/stats", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setStats(data.stats))
      .catch(() => {});
  }, []);

  if (!stats) {
    return <div className="text-center py-12 text-muted-foreground">Loading stats...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active Properties</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold">{stats.totalProperties}</p></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold">{stats.totalBookings}</p></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold text-amber-500">{stats.pendingBookings}</p></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Confirmed Bookings</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold text-emerald-500">{stats.confirmedBookings}</p></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold">${stats.totalRevenue?.toLocaleString() || 0}</p></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Unanswered Questions</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold text-blue-500">{stats.unansweredQuestions}</p></CardContent>
      </Card>
    </div>
  );
}

function PropertiesTab() {
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadProperties(); }, []);

  const loadProperties = async () => {
    try {
      const res = await fetch("/api/host/properties", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProperties(data.properties || []);
      }
    } catch { } finally { setIsLoading(false); }
  };

  if (isLoading) return <div className="text-center py-12">Loading properties...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Properties</h2>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add Property"}
        </Button>
      </div>

      {showForm && <NewPropertyForm onCreated={() => { loadProperties(); setShowForm(false); }} />}

      {properties.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground mb-4">No properties yet. List your first property to start receiving bookings!</p>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowForm(true)}>List Your Property</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {properties.map((prop: any) => (
            <Card key={prop.id}>
              <CardContent className="p-4 flex gap-4">
                {prop.coverImage && (
                  <img src={prop.coverImage} alt={prop.title} className="w-32 h-24 object-cover rounded-lg" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{prop.title}</h3>
                    <Badge variant={
                      prop.status === "approved" ? "default" :
                      prop.status === "pending_approval" ? "secondary" :
                      "destructive"
                    }>
                      {prop.status === "pending_approval" ? "Pending Review" : prop.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{prop.city}, {prop.state} - {prop.propertyType}</p>
                  <p className="text-sm mt-1">
                    ${((prop.baseNightlyRate || 0) / 100).toFixed(0)}/night
                    {" · "}{prop.bedrooms} bed{prop.bedrooms !== 1 ? "s" : ""}
                    {" · "}{prop.maxGuests} guest{prop.maxGuests !== 1 ? "s" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewPropertyForm({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", propertyType: "entire_place", category: "apartment",
    address: "", city: "", state: "", postcode: "",
    maxGuests: 2, bedrooms: 1, beds: 1, bathrooms: "1",
    baseNightlyRate: "", cleaningFee: "", minNights: 1,
    houseRules: "", checkInInstructions: "", nearbyHighlight: "",
    amenities: [] as string[], selfCheckIn: false, petFriendly: false,
    coverImage: "",
  });

  const amenityOptions = ["WiFi", "Kitchen", "Pool", "Parking", "Air Conditioning", "Heating",
    "Washer", "Dryer", "TV", "Beach Access", "Garden", "BBQ", "Gym", "Elevator", "Balcony"];

  const toggleAmenity = (a: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter(x => x !== a)
        : [...prev.amenities, a],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.address || !form.city || !form.baseNightlyRate) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/host/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          baseNightlyRate: Math.round(parseFloat(form.baseNightlyRate) * 100),
          cleaningFee: form.cleaningFee ? Math.round(parseFloat(form.cleaningFee) * 100) : 0,
          images: form.coverImage ? [form.coverImage] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Property submitted!", description: "Your property is pending admin approval." });
      onCreated();
    } catch {
      toast({ title: "Error", description: "Failed to create property", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Add New Property</CardTitle>
        <CardDescription>Your property will be reviewed by our team before going live.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input placeholder="Stunning Bondi Beach Apartment" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
            </div>
            <div>
              <label className="text-sm font-medium">Cover Image URL</label>
              <Input placeholder="https://..." value={form.coverImage} onChange={e => setForm({...form, coverImage: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Description *</label>
            <Textarea placeholder="Describe your property..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={4} required />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Type</label>
              <select className="w-full rounded-md border p-2 text-sm" value={form.propertyType} onChange={e => setForm({...form, propertyType: e.target.value})}>
                <option value="entire_place">Entire Place</option>
                <option value="private_room">Private Room</option>
                <option value="shared_room">Shared Room</option>
                <option value="unique_stay">Unique Stay</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <select className="w-full rounded-md border p-2 text-sm" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="cabin">Cabin</option>
                <option value="villa">Villa</option>
                <option value="cottage">Cottage</option>
                <option value="loft">Loft</option>
                <option value="studio">Studio</option>
                <option value="townhouse">Townhouse</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Base Rate ($/night) *</label>
              <Input type="number" step="0.01" placeholder="189.00" value={form.baseNightlyRate} onChange={e => setForm({...form, baseNightlyRate: e.target.value})} required />
            </div>
            <div>
              <label className="text-sm font-medium">Cleaning Fee ($)</label>
              <Input type="number" step="0.01" placeholder="85.00" value={form.cleaningFee} onChange={e => setForm({...form, cleaningFee: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Address *</label>
              <Input placeholder="123 Main St" value={form.address} onChange={e => setForm({...form, address: e.target.value})} required />
            </div>
            <div>
              <label className="text-sm font-medium">City *</label>
              <Input placeholder="Sydney" value={form.city} onChange={e => setForm({...form, city: e.target.value})} required />
            </div>
            <div>
              <label className="text-sm font-medium">State</label>
              <Input placeholder="NSW" value={form.state} onChange={e => setForm({...form, state: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium">Postcode</label>
              <Input placeholder="2000" value={form.postcode} onChange={e => setForm({...form, postcode: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Max Guests</label>
              <Input type="number" value={form.maxGuests} onChange={e => setForm({...form, maxGuests: parseInt(e.target.value) || 1})} />
            </div>
            <div>
              <label className="text-sm font-medium">Bedrooms</label>
              <Input type="number" value={form.bedrooms} onChange={e => setForm({...form, bedrooms: parseInt(e.target.value) || 0})} />
            </div>
            <div>
              <label className="text-sm font-medium">Beds</label>
              <Input type="number" value={form.beds} onChange={e => setForm({...form, beds: parseInt(e.target.value) || 1})} />
            </div>
            <div>
              <label className="text-sm font-medium">Min Nights</label>
              <Input type="number" value={form.minNights} onChange={e => setForm({...form, minNights: parseInt(e.target.value) || 1})} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {amenityOptions.map(a => (
                <Badge key={a} variant={form.amenities.includes(a) ? "default" : "outline"}
                  className="cursor-pointer" onClick={() => toggleAmenity(a)}>{a}</Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">House Rules</label>
              <Textarea placeholder="No smoking, no parties..." value={form.houseRules} onChange={e => setForm({...form, houseRules: e.target.value})} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium">Check-in Instructions</label>
              <Textarea placeholder="Self check-in via smart lock..." value={form.checkInInstructions} onChange={e => setForm({...form, checkInInstructions: e.target.value})} rows={2} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Nearby Highlight</label>
            <Input placeholder="5 min walk to beach" value={form.nearbyHighlight} onChange={e => setForm({...form, nearbyHighlight: e.target.value})} />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.selfCheckIn} onChange={e => setForm({...form, selfCheckIn: e.target.checked})} />
              Self check-in
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.petFriendly} onChange={e => setForm({...form, petFriendly: e.target.checked})} />
              Pet friendly
            </label>
          </div>

          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Property for Review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function BookingsTab() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const { toast } = useToast();

  useEffect(() => { loadBookings(); }, [filter]);

  const loadBookings = async () => {
    try {
      const url = filter ? `/api/host/bookings?status=${filter}` : "/api/host/bookings";
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch { } finally { setIsLoading(false); }
  };

  const handleAction = async (bookingId: string, action: "approve" | "decline", reason?: string) => {
    try {
      const res = await fetch(`/api/host/bookings/${bookingId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: action === "approve" ? "Booking approved!" : "Booking declined", description: data.message });
        loadBookings();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Action failed", variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Bookings</h2>
        <div className="flex gap-2">
          {["", "PENDING_APPROVAL", "CONFIRMED", "COMPLETED", "DECLINED"].map(s => (
            <Button key={s} size="sm" variant={filter === s ? "default" : "outline"}
              onClick={() => setFilter(s)}>
              {s === "" ? "All" : s === "PENDING_APPROVAL" ? "Pending" : s.charAt(0) + s.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent><p className="text-muted-foreground">No bookings found</p></CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bookings.map((b: any) => (
            <Card key={b.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm">{b.id}</span>
                      <Badge variant={
                        b.status === "CONFIRMED" ? "default" :
                        b.status === "PENDING_APPROVAL" ? "secondary" :
                        b.status === "DECLINED" ? "destructive" : "outline"
                      }>{b.status}</Badge>
                      {b.idVerified && <Badge variant="outline" className="text-emerald-500">ID Verified</Badge>}
                    </div>
                    <p className="font-semibold">{b.propertyTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      Guest: {b.guestName || `${b.guestFirstName} ${b.guestLastName}`}
                      {b.guestEmail && ` (${b.guestEmail})`}
                    </p>
                    <p className="text-sm mt-1">
                      {b.checkInDate} → {b.checkOutDate} ({b.nights} night{b.nights !== 1 ? "s" : ""})
                      {" · "}{b.guests} guest{b.guests !== 1 ? "s" : ""}
                    </p>
                    <p className="text-sm font-medium mt-1">${((b.totalPrice || 0) / 100).toFixed(2)} AUD</p>
                    {b.guestMessage && (
                      <p className="text-sm mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded italic">"{b.guestMessage}"</p>
                    )}
                  </div>

                  {b.status === "PENDING_APPROVAL" && (
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleAction(b.id, "approve")}>Approve</Button>
                      <Button size="sm" variant="destructive"
                        onClick={() => handleAction(b.id, "decline", "Not available for these dates")}>Decline</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AvailabilityTab() {
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProp, setSelectedProp] = useState("");
  const [availability, setAvailability] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // New availability entry
  const [newDates, setNewDates] = useState<{ date: string; isGapNight: boolean; nightlyRate: string; gapNightDiscount: string; notes: string }[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isGap, setIsGap] = useState(true);
  const [rate, setRate] = useState("");
  const [discount, setDiscount] = useState("25");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/host/properties", { credentials: "include" })
      .then(r => r.ok ? r.json() : { properties: [] })
      .then(data => {
        setProperties(data.properties || []);
        if (data.properties?.length > 0) setSelectedProp(data.properties[0].id);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (selectedProp) loadAvailability();
  }, [selectedProp]);

  const loadAvailability = async () => {
    try {
      const res = await fetch(`/api/host/properties/${selectedProp}/availability`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAvailability(data.availability || []);
      }
    } catch { }
  };

  const handleAddAvailability = async () => {
    if (!startDate || !selectedProp) {
      toast({ title: "Error", description: "Select a property and start date", variant: "destructive" });
      return;
    }

    const dates: any[] = [];
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push({
        date: d.toISOString().split("T")[0],
        isAvailable: true,
        isGapNight: isGap,
        nightlyRate: rate ? Math.round(parseFloat(rate) * 100) : undefined,
        gapNightDiscount: isGap ? parseInt(discount) : 0,
        notes: notes || undefined,
      });
    }

    try {
      const res = await fetch(`/api/host/properties/${selectedProp}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dates }),
      });

      if (res.ok) {
        toast({ title: "Success", description: `${dates.length} dates added` });
        loadAvailability();
        setStartDate("");
        setEndDate("");
        setNotes("");
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update availability", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="text-center py-12">Loading...</div>;

  const selectedProperty = properties.find(p => p.id === selectedProp);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Manage Availability</h2>

      {properties.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent><p className="text-muted-foreground">Add a property first to manage availability.</p></CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4">
            <select className="rounded-md border p-2 text-sm" value={selectedProp}
              onChange={e => setSelectedProp(e.target.value)}>
              {properties.map((p: any) => (
                <option key={p.id} value={p.id}>{p.title} - {p.city}</option>
              ))}
            </select>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Add Available Dates</CardTitle>
              <CardDescription>Mark dates as available for booking. Toggle "Gap Night" to offer discounts on gap nights between existing bookings.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date (optional)</label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Rate Override ($/night)</label>
                  <Input type="number" step="0.01" placeholder={selectedProperty ? `${(selectedProperty.baseNightlyRate / 100).toFixed(0)} (base)` : ""}
                    value={rate} onChange={e => setRate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Gap Night Discount %</label>
                  <Input type="number" value={discount} onChange={e => setDiscount(e.target.value)} disabled={!isGap} />
                </div>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={isGap} onChange={e => setIsGap(e.target.checked)} />
                  Mark as Gap Night (discounted)
                </label>
                <Input placeholder="Notes (e.g., 'Between two bookings')" value={notes} onChange={e => setNotes(e.target.value)} className="flex-1" />
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAddAvailability}>
                Add Availability
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Availability ({availability.length} dates)</CardTitle>
            </CardHeader>
            <CardContent>
              {availability.length === 0 ? (
                <p className="text-muted-foreground">No availability set. Add dates above.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {availability.slice(0, 60).map((a: any) => (
                    <div key={a.id} className={`p-3 rounded-lg border text-sm ${
                      a.isGapNight ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200" :
                      a.isAvailable ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200" :
                      "bg-gray-100 dark:bg-gray-800 border-gray-200"
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{a.date}</span>
                        {a.isGapNight && <Badge className="bg-emerald-500">Gap Night</Badge>}
                        {!a.isAvailable && <Badge variant="destructive">Booked</Badge>}
                      </div>
                      <p className="text-xs mt-1">
                        ${((a.nightlyRate || 0) / 100).toFixed(0)}/night
                        {a.isGapNight && a.gapNightDiscount > 0 && (
                          <span className="text-emerald-600 ml-1">(-{a.gapNightDiscount}% = ${(Math.round(a.nightlyRate * (1 - a.gapNightDiscount / 100)) / 100).toFixed(0)})</span>
                        )}
                      </p>
                      {a.notes && <p className="text-xs text-muted-foreground mt-1">{a.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function QATab() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => { loadQuestions(); }, []);

  const loadQuestions = async () => {
    try {
      const res = await fetch("/api/host/qa", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch { } finally { setIsLoading(false); }
  };

  const handleAnswer = async (questionId: string) => {
    const answer = answerText[questionId];
    if (!answer?.trim()) return;

    try {
      const res = await fetch(`/api/host/qa/${questionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answer }),
      });
      if (res.ok) {
        toast({ title: "Answer posted!" });
        loadQuestions();
        setAnswerText(prev => ({ ...prev, [questionId]: "" }));
      }
    } catch {
      toast({ title: "Error", description: "Failed to post answer", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="text-center py-12">Loading questions...</div>;

  const unanswered = questions.filter(q => !q.answer);
  const answered = questions.filter(q => q.answer);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Questions & Answers</h2>

      {unanswered.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 text-amber-500">Unanswered ({unanswered.length})</h3>
          <div className="grid gap-4">
            {unanswered.map((q: any) => (
              <Card key={q.id}>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">{q.propertyTitle} · {q.userName}</p>
                  <p className="font-medium mb-3">"{q.question}"</p>
                  <div className="flex gap-2">
                    <Textarea placeholder="Type your answer..."
                      value={answerText[q.id] || ""}
                      onChange={e => setAnswerText(prev => ({ ...prev, [q.id]: e.target.value }))}
                      rows={2} className="flex-1" />
                    <Button className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleAnswer(q.id)} disabled={!answerText[q.id]?.trim()}>Reply</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {answered.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Answered ({answered.length})</h3>
          <div className="grid gap-4">
            {answered.map((q: any) => (
              <Card key={q.id}>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">{q.propertyTitle} · {q.userName}</p>
                  <p className="font-medium">Q: "{q.question}"</p>
                  <p className="text-sm mt-1 text-emerald-600">A: {q.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {questions.length === 0 && (
        <Card className="text-center py-12">
          <CardContent><p className="text-muted-foreground">No questions yet. Questions from potential guests will appear here.</p></CardContent>
        </Card>
      )}
    </div>
  );
}

function ProfileTab({ host, onUpdate }: { host: any; onUpdate: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(host.name || "");
  const [phone, setPhone] = useState(host.phone || "");
  const [bio, setBio] = useState(host.bio || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/host/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, phone, bio }),
      });
      if (res.ok) {
        toast({ title: "Profile updated!" });
        onUpdate();
      } else {
        toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-bold mb-6">Your Profile</h2>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input value={host.email} disabled className="opacity-60" />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+61 4XX XXX XXX" />
          </div>
          <div>
            <label className="text-sm font-medium">Bio</label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={4}
              placeholder="Tell guests about yourself..." />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Response Time: ~{host.averageResponseTime || 60} minutes</p>
            <p>Response Rate: {host.responseRate || 100}%</p>
            <p>Member since: {host.createdAt ? new Date(host.createdAt).toLocaleDateString() : "N/A"}</p>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
