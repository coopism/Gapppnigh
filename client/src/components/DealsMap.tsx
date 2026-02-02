import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Deal } from "@shared/schema";
import { formatPrice } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import "leaflet/dist/leaflet.css";

interface DealsMapProps {
  deals: Deal[];
  selectedDealId?: string;
  onDealSelect?: (dealId: string) => void;
}

export function DealsMap({ deals, selectedDealId, onDealSelect }: DealsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.Marker[]>([]);
  
  const validDeals = deals.filter(d => d.latitude && d.longitude);
  
  useEffect(() => {
    if (!mapContainer.current || validDeals.length === 0) return;
    
    // Calculate center
    const lats = validDeals.map(d => parseFloat(d.latitude!));
    const lngs = validDeals.map(d => parseFloat(d.longitude!));
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    
    // Initialize map with clean CartoDB tiles
    map.current = L.map(mapContainer.current, {
      attributionControl: false,
      zoomControl: true,
    }).setView([centerLat, centerLng], 8);
    
    // Add clean, minimal tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map.current);
    
    // Create custom icon
    const createIcon = (isSelected: boolean) => L.divIcon({
      className: 'custom-marker',
      html: `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="${isSelected ? '#f59e0b' : '#0ea5a5'}" stroke="white" stroke-width="1.5" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="white"></circle>
        </svg>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
    
    // Add markers
    validDeals.forEach((deal) => {
      const popupContent = `
        <div style="min-width: 200px; padding: 8px;">
          <img src="${deal.imageUrl}" alt="${deal.hotelName}" style="width: 100%; height: 96px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" />
          <h3 style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">${deal.hotelName}</h3>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">⭐ ${deal.rating} (${deal.reviewCount})</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">📅 ${format(parseISO(deal.checkInDate), "MMM d")} (${deal.nights}N)</div>
          <div style="display: flex; justify-between; align-items: center;">
            <div>
              <span style="font-size: 12px; text-decoration: line-through; color: #999;">${formatPrice(deal.normalPrice, deal.currency)}</span>
              <span style="margin-left: 8px; font-weight: bold; color: #0ea5a5;">${formatPrice(deal.dealPrice, deal.currency)}</span>
            </div>
            <span style="font-size: 12px; font-weight: bold; color: #d97706; background: #fef3c7; padding: 2px 6px; border-radius: 4px;">${Math.round(((deal.normalPrice - deal.dealPrice) / deal.normalPrice) * 100)}% OFF</span>
          </div>
        </div>
      `;
      
      const marker = L.marker(
        [parseFloat(deal.latitude!), parseFloat(deal.longitude!)],
        { icon: createIcon(selectedDealId === deal.id) }
      )
        .bindPopup(popupContent, { closeButton: false })
        .addTo(map.current!)
        .on('click', () => {
          onDealSelect?.(deal.id);
        });
      
      markers.current.push(marker);
    });
    
    // Fit bounds
    if (validDeals.length > 1) {
      const bounds = L.latLngBounds(
        validDeals.map(d => [parseFloat(d.latitude!), parseFloat(d.longitude!)] as [number, number])
      );
      map.current.fitBounds(bounds, { padding: [50, 50] });
    }
    
    return () => {
      markers.current.forEach(m => m.remove());
      markers.current = [];
      map.current?.remove();
    };
  }, [validDeals, selectedDealId, onDealSelect]);
  
  if (validDeals.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-xl">
        <p className="text-muted-foreground">No deals with location data available</p>
      </div>
    );
  }
  
  return (
    <div 
      ref={mapContainer} 
      className="w-full h-full rounded-xl overflow-hidden" 
      data-testid="deals-map"
    />
  );
}
