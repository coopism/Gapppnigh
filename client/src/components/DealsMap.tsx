import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { Deal } from "@shared/schema";
import { Star, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "wouter";
import "leaflet/dist/leaflet.css";
import { formatPrice } from "@/lib/utils";

const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface DealsMapProps {
  deals: Deal[];
  selectedDealId?: string;
  onDealSelect?: (dealId: string) => void;
}

function FitBounds({ deals }: { deals: Deal[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (deals.length > 0) {
      const validDeals = deals.filter(d => d.latitude && d.longitude);
      if (validDeals.length > 0) {
        const bounds = L.latLngBounds(
          validDeals.map(d => [parseFloat(d.latitude!), parseFloat(d.longitude!)])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [deals, map]);
  
  return null;
}

export function DealsMap({ deals, selectedDealId, onDealSelect }: DealsMapProps) {
  const mapRef = useRef<L.Map>(null);
  
  const validDeals = deals.filter(d => d.latitude && d.longitude);
  
  if (validDeals.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-xl">
        <p className="text-muted-foreground">No deals with location data available</p>
      </div>
    );
  }
  
  const center: [number, number] = [
    parseFloat(validDeals[0].latitude!),
    parseFloat(validDeals[0].longitude!),
  ];

  return (
    <MapContainer
      center={center}
      zoom={5}
      className="w-full h-full rounded-xl z-0"
      ref={mapRef}
      data-testid="deals-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <FitBounds deals={validDeals} />
      {validDeals.map((deal) => {
        const discountPercent = Math.round(
          ((deal.normalPrice - deal.dealPrice) / deal.normalPrice) * 100
        );
        const checkIn = format(parseISO(deal.checkInDate), "MMM d");
        
        return (
          <Marker
            key={deal.id}
            position={[parseFloat(deal.latitude!), parseFloat(deal.longitude!)]}
            icon={customIcon}
            eventHandlers={{
              click: () => onDealSelect?.(deal.id),
            }}
          >
            <Popup>
              <Link href={`/deal/${deal.id}`} className="block min-w-[200px]">
                <div className="space-y-2">
                  <img 
                    src={deal.imageUrl} 
                    alt={deal.hotelName}
                    className="w-full h-24 object-cover rounded-md"
                  />
                  <div>
                    <h3 className="font-bold text-sm text-foreground line-clamp-1">
                      {deal.hotelName}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{deal.rating}</span>
                      <span>({deal.reviewCount})</span>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>{checkIn} ({deal.nights}N)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs line-through text-muted-foreground">
                        {formatPrice(deal.normalPrice, deal.currency)}
                      </span>
                      <span className="ml-2 font-bold text-primary">
                        {formatPrice(deal.dealPrice, deal.currency)}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                      {discountPercent}% OFF
                    </span>
                  </div>
                </div>
              </Link>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
