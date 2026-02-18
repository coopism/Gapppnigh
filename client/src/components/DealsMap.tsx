import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { Deal } from "@shared/schema";
import { formatPrice } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import "leaflet/dist/leaflet.css";

interface MapItem {
  id: string;
  lat: number;
  lng: number;
  price: number;
  currency: string;
  label: string;
  image: string;
  subtitle: string;
  link: string;
  type: "deal" | "property";
}

interface DealsMapProps {
  deals?: Deal[];
  properties?: any[];
  selectedId?: string;
  onSelect?: (id: string, type: "deal" | "property") => void;
  // legacy compat
  selectedDealId?: string;
  onDealSelect?: (dealId: string) => void;
}

function normalizeItems(deals?: Deal[], properties?: any[]): MapItem[] {
  const items: MapItem[] = [];

  (deals || []).forEach(d => {
    if (!d.latitude || !d.longitude) return;
    items.push({
      id: d.id,
      lat: parseFloat(d.latitude),
      lng: parseFloat(d.longitude),
      price: d.dealPrice,
      currency: d.currency,
      label: d.hotelName,
      image: d.imageUrl,
      subtitle: `${d.rating}★ · ${d.nights}N · ${format(parseISO(d.checkInDate), "MMM d")}`,
      link: `/deal/${d.id}`,
      type: "deal",
    });
  });

  (properties || []).forEach(p => {
    if (!p.latitude || !p.longitude) return;
    const price = p.baseNightlyRate ? p.baseNightlyRate / 100 : 0;
    items.push({
      id: p.id,
      lat: parseFloat(p.latitude),
      lng: parseFloat(p.longitude),
      price,
      currency: "AUD",
      label: p.title || "Property",
      image: p.coverImage || p.images?.[0] || "",
      subtitle: `${p.city || ""} · ${p.maxGuests || 2} guests`,
      link: `/stays/${p.id}`,
      type: "property",
    });
  });

  return items;
}

export function DealsMap({ deals, properties, selectedId, onSelect, selectedDealId, onDealSelect }: DealsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const items = normalizeItems(deals, properties);
  const selId = selectedId || selectedDealId || null;

  useEffect(() => {
    if (!mapContainer.current || items.length === 0) return;

    const lats = items.map(i => i.lat);
    const lngs = items.map(i => i.lng);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

    map.current = L.map(mapContainer.current, {
      attributionControl: false,
      zoomControl: true,
    }).setView([centerLat, centerLng], 10);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map.current);

    // Inject CSS for price pill markers
    const styleId = "gapnight-map-markers";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .gn-price-marker {
          background: #fff;
          color: #222;
          font-weight: 700;
          font-size: 13px;
          padding: 5px 10px;
          border-radius: 20px;
          box-shadow: 0 2px 6px rgba(0,0,0,.16), 0 0 0 1px rgba(0,0,0,.04);
          white-space: nowrap;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, box-shadow 0.15s;
          line-height: 1;
          text-align: center;
          position: relative;
        }
        .gn-marker-wrap {
          background: none !important;
          border: none !important;
        }
        .gn-price-marker:hover, .gn-price-marker.active {
          background: #222;
          color: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,.25);
          z-index: 1000 !important;
        }
        .gn-popup .leaflet-popup-content-wrapper {
          border-radius: 16px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 6px 24px rgba(0,0,0,.18);
          background: #fff;
          border: none;
        }
        .gn-popup .leaflet-popup-content {
          margin: 0;
          width: 260px !important;
          line-height: 1.4;
        }
        .gn-popup .leaflet-popup-tip-container {
          margin-top: -1px;
        }
        .gn-popup .leaflet-popup-tip {
          background: #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,.08);
          border: none;
        }
        .gn-popup .leaflet-popup-close-button {
          display: none;
        }
      `;
      document.head.appendChild(style);
    }

    items.forEach((item) => {
      const priceText = formatPrice(item.price, item.currency);
      const isActive = selId === item.id;

      const icon = L.divIcon({
        className: "gn-marker-wrap",
        html: `<div class="gn-price-marker${isActive ? " active" : ""}" data-id="${item.id}">${priceText}</div>`,
        iconSize: [80, 28],
        iconAnchor: [40, 14],
      });

      const popupHtml = `
        <a href="${item.link}" style="text-decoration:none;color:inherit;display:block;background:#fff;border-radius:16px;overflow:hidden;">
          ${item.image ? `<div style="width:100%;height:150px;overflow:hidden;"><img src="${item.image}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.parentElement.style.display='none'" /></div>` : ""}
          <div style="padding:12px 14px 14px;">
            <div style="font-weight:600;font-size:14px;color:#222;line-height:1.35;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.label}</div>
            <div style="font-size:12px;color:#717171;margin-bottom:8px;">${item.subtitle}</div>
            <div><span style="font-weight:700;font-size:16px;color:#222;">${priceText}</span><span style="font-weight:400;font-size:13px;color:#717171;"> / night</span></div>
          </div>
        </a>
      `;

      const marker = L.marker([item.lat, item.lng], { icon })
        .bindPopup(popupHtml, { closeButton: false, className: "gn-popup", maxWidth: 260, minWidth: 260 })
        .addTo(map.current!)
        .on("click", () => {
          setActiveId(item.id);
          if (onSelect) onSelect(item.id, item.type);
          else if (onDealSelect && item.type === "deal") onDealSelect(item.id);
        });

      markersRef.current.push(marker);
    });

    if (items.length > 1) {
      const bounds = L.latLngBounds(items.map(i => [i.lat, i.lng] as [number, number]));
      map.current.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.current?.remove();
    };
  }, [items.length, selId]);

  if (items.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-xl">
        <p className="text-muted-foreground">No listings with location data available</p>
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
