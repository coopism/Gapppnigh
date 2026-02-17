import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PropertyDealCard } from "@/components/PropertyDealCard";
import { formatPrice } from "@/lib/utils";
import {
  Star, MapPin, Shield, Clock, MessageCircle, ChevronLeft, Calendar,
  Home, Check, Award, Users, Heart, ShieldCheck,
} from "lucide-react";

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

export default function HostProfile() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [host, setHost] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/hosts/${params.id}/profile`)
        .then(r => {
          if (!r.ok) throw new Error("Not found");
          return r.json();
        })
        .then(data => {
          setHost(data.host);
          setProperties(data.properties || []);
        })
        .catch(() => setHost(null))
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

  if (!host) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">Host not found</h2>
          <p className="text-muted-foreground mb-6">This host profile may have been removed or doesn't exist.</p>
          <Button onClick={() => setLocation("/deals")}>Browse Deals</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Back button */}
        <button onClick={() => window.history.back()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {/* Host profile header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {/* Left: Host card */}
          <Card>
            <CardContent className="p-6 text-center">
              {host.profilePhoto ? (
                <img src={host.profilePhoto} alt={host.name} className="w-24 h-24 rounded-full object-cover mx-auto mb-4" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl mx-auto mb-4">
                  {host.name.charAt(0)}
                </div>
              )}
              <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                {host.name}
                {host.idVerified && (
                  <span title="ID Verified" className="text-primary"><ShieldCheck className="w-5 h-5" /></span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Member since {formatMemberSince(host.createdAt)}</p>
              
            </CardContent>
          </Card>

          {/* Right: Stats + Bio */}
          <div className="md:col-span-2 space-y-6">
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-card border rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-primary">{host.totalProperties || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Listings</div>
              </div>
              <div className="bg-card border rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-primary">{host.totalReviews || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Reviews</div>
              </div>
              <div className="bg-card border rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {host.averageRating ? Number(host.averageRating).toFixed(1) : "New"}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Rating
                </div>
              </div>
              <div className="bg-card border rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-primary">{host.responseRate || 0}%</div>
                <div className="text-xs text-muted-foreground mt-1">Response rate</div>
              </div>
            </div>

            {/* Host details */}
            <div className="bg-card border rounded-xl p-6 space-y-4">
              {host.bio && (
                <div>
                  <h3 className="font-semibold mb-2">About {host.name}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{host.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>
                    Responds in ~{host.averageResponseTime < 60
                      ? `${host.averageResponseTime} minutes`
                      : `${Math.round(host.averageResponseTime / 60)} hour${Math.round(host.averageResponseTime / 60) !== 1 ? "s" : ""}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  <span>{host.responseRate}% response rate</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Host's listings */}
        {properties.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Home className="w-5 h-5" />
              {host.name}'s listings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((prop: any) => (
                <div key={prop.id} className="animate-fade-in">
                  <PropertyDealCard property={prop} />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
