import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Trash2, Info, Calendar, Clock, DollarSign, Bed, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { AutoListingRule, RoomTypeRecord } from "@shared/schema";

const DAYS_OF_WEEK = [
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
  { value: "SAT", label: "Saturday" },
  { value: "SUN", label: "Sunday" },
];

export default function AutoListingRules() {
  const { hotelId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roomTypes, setRoomTypes] = useState<RoomTypeRecord[]>([]);
  const [rule, setRule] = useState<Partial<AutoListingRule>>({
    enabled: false,
    hoursBeforeCheckin: 48,
    defaultDiscountPercent: 30,
    minPriceFloor: 50,
    roomTypeIds: null,
    daysOfWeek: null,
    blackoutDates: [],
    requiresGap: true,
    minGapDuration: 1,
  });

  useEffect(() => {
    fetchData();
  }, [hotelId]);

  async function fetchData() {
    try {
      setLoading(true);
      
      // Fetch room types
      const roomTypesRes = await fetch(`/api/owner/hotels/${hotelId}/room-types`, {
        credentials: "include",
      });
      if (roomTypesRes.ok) {
        const data = await roomTypesRes.json();
        setRoomTypes(data);
      }
      
      // Fetch existing rule
      const ruleRes = await fetch(`/api/owner/hotels/${hotelId}/auto-listing-rule`, {
        credentials: "include",
      });
      if (ruleRes.ok) {
        const data = await ruleRes.json();
        if (data) {
          setRule(data);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load auto-listing rules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      
      const res = await fetch(`/api/owner/hotels/${hotelId}/auto-listing-rule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...rule,
          hotelId,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save rule");
      }

      const savedRule = await res.json();
      setRule(savedRule);
      
      toast({
        title: "Success",
        description: "Auto-listing rules saved successfully",
      });
    } catch (error) {
      console.error("Error saving rule:", error);
      toast({
        title: "Error",
        description: "Failed to save auto-listing rules",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete these auto-listing rules?")) {
      return;
    }

    try {
      setSaving(true);
      
      const res = await fetch(`/api/owner/hotels/${hotelId}/auto-listing-rule`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to delete rule");
      }

      setRule({
        enabled: false,
        hoursBeforeCheckin: 48,
        defaultDiscountPercent: 30,
        minPriceFloor: 50,
        roomTypeIds: null,
        daysOfWeek: null,
        blackoutDates: [],
        requiresGap: true,
        minGapDuration: 1,
      });
      
      toast({
        title: "Success",
        description: "Auto-listing rules deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast({
        title: "Error",
        description: "Failed to delete auto-listing rules",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function toggleDayOfWeek(day: string) {
    const currentDays = rule.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    
    setRule({ ...rule, daysOfWeek: newDays.length === 7 ? null : newDays });
  }

  function toggleRoomType(roomTypeId: string) {
    const currentRoomTypes = rule.roomTypeIds || [];
    const newRoomTypes = currentRoomTypes.includes(roomTypeId)
      ? currentRoomTypes.filter(id => id !== roomTypeId)
      : [...currentRoomTypes, roomTypeId];
    
    setRule({ ...rule, roomTypeIds: newRoomTypes.length === roomTypes.length ? null : newRoomTypes });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automatic Listing Rules</h1>
          <p className="text-muted-foreground mt-1">
            Configure rules to automatically publish gap nights without manual intervention
          </p>
        </div>
        <Button variant="outline" onClick={() => setLocation(`/owner/hotels/${hotelId}`)}>
          Back to Hotel
        </Button>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <CardTitle className="text-lg">How Auto-Listing Works</CardTitle>
              <CardDescription className="mt-2">
                When enabled, the system runs daily to identify orphan nights (gaps between bookings) and automatically publishes them as deals according to your rules. You maintain full control over pricing, room types, and timing.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enable Auto-Listing</CardTitle>
          <CardDescription>
            Turn automatic listing on or off for this hotel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enabled" className="text-base">
                Automatic Listing
              </Label>
              <p className="text-sm text-muted-foreground">
                {rule.enabled ? "System will automatically publish gap nights" : "Manual listing only"}
              </p>
            </div>
            <Switch
              id="enabled"
              checked={rule.enabled}
              onCheckedChange={(checked) => setRule({ ...rule, enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {rule.enabled && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Timing Settings
              </CardTitle>
              <CardDescription>
                When should gap nights be automatically listed?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hoursBeforeCheckin">Hours Before Check-in</Label>
                <Input
                  id="hoursBeforeCheckin"
                  type="number"
                  min="1"
                  max="720"
                  value={rule.hoursBeforeCheckin}
                  onChange={(e) => setRule({ ...rule, hoursBeforeCheckin: parseInt(e.target.value) || 48 })}
                />
                <p className="text-sm text-muted-foreground">
                  List gap nights this many hours before check-in (default: 48 hours)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Pricing Settings
              </CardTitle>
              <CardDescription>
                How should gap nights be priced?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultDiscountPercent">Default Discount (%)</Label>
                <Input
                  id="defaultDiscountPercent"
                  type="number"
                  min="1"
                  max="90"
                  value={rule.defaultDiscountPercent}
                  onChange={(e) => setRule({ ...rule, defaultDiscountPercent: parseInt(e.target.value) || 30 })}
                />
                <p className="text-sm text-muted-foreground">
                  Discount percentage off BAR rate (default: 30%)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minPriceFloor">Minimum Price Floor ($)</Label>
                <Input
                  id="minPriceFloor"
                  type="number"
                  min="1"
                  value={rule.minPriceFloor}
                  onChange={(e) => setRule({ ...rule, minPriceFloor: parseInt(e.target.value) || 50 })}
                />
                <p className="text-sm text-muted-foreground">
                  Never list below this price, even with discount applied
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bed className="w-5 h-5" />
                Room Type Filtering
              </CardTitle>
              <CardDescription>
                Which room types should be auto-listed?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {roomTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No room types configured. Add room types to your hotel first.
                </p>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="all-room-types"
                      checked={!rule.roomTypeIds || rule.roomTypeIds.length === 0}
                      onCheckedChange={(checked) => {
                        setRule({ ...rule, roomTypeIds: checked ? null : [] });
                      }}
                    />
                    <Label htmlFor="all-room-types" className="font-medium">
                      All Room Types
                    </Label>
                  </div>
                  {roomTypes.map((roomType) => (
                    <div key={roomType.id} className="flex items-center space-x-2 ml-6">
                      <Checkbox
                        id={`room-type-${roomType.id}`}
                        checked={!rule.roomTypeIds || rule.roomTypeIds.includes(roomType.id)}
                        onCheckedChange={() => toggleRoomType(roomType.id)}
                        disabled={!rule.roomTypeIds || rule.roomTypeIds.length === 0}
                      />
                      <Label htmlFor={`room-type-${roomType.id}`}>
                        {roomType.name}
                      </Label>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Day of Week Filtering
              </CardTitle>
              <CardDescription>
                Which days should be auto-listed?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="all-days"
                  checked={!rule.daysOfWeek || rule.daysOfWeek.length === 0}
                  onCheckedChange={(checked) => {
                    setRule({ ...rule, daysOfWeek: checked ? null : [] });
                  }}
                />
                <Label htmlFor="all-days" className="font-medium">
                  All Days
                </Label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 ml-6">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={!rule.daysOfWeek || rule.daysOfWeek.includes(day.value)}
                      onCheckedChange={() => toggleDayOfWeek(day.value)}
                      disabled={!rule.daysOfWeek || rule.daysOfWeek.length === 0}
                    />
                    <Label htmlFor={`day-${day.value}`}>
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Orphan Night Detection
              </CardTitle>
              <CardDescription>
                Only list nights that are gaps between bookings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="requiresGap" className="text-base">
                    Require Orphan Night
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Only auto-list if night is between existing bookings
                  </p>
                </div>
                <Switch
                  id="requiresGap"
                  checked={rule.requiresGap}
                  onCheckedChange={(checked) => setRule({ ...rule, requiresGap: checked })}
                />
              </div>

              {rule.requiresGap && (
                <div className="space-y-2">
                  <Label htmlFor="minGapDuration">Minimum Gap Duration (nights)</Label>
                  <Input
                    id="minGapDuration"
                    type="number"
                    min="1"
                    max="30"
                    value={rule.minGapDuration}
                    onChange={(e) => setRule({ ...rule, minGapDuration: parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Only list gaps of at least this many consecutive nights
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Rules
            </>
          )}
        </Button>
        {rule.id && (
          <Button variant="destructive" onClick={handleDelete} disabled={saving}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Rules
          </Button>
        )}
      </div>
    </div>
  );
}
