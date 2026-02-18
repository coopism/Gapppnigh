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
      subdomains: "abcd",
    }).addTo(map.current);

    // Inject CSS for price pill markers
    const styleId = "gapnight-map-markers";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .gn-marker-wrap {
          background: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        .gn-price-marker {
          background: #ffffff;
          color: #111;
          font-weight: 700;
          font-size: 12.5px;
          font-family: 'DM Sans', system-ui, sans-serif;
          letter-spacing: -0.01em;
          padding: 5px 11px;
          border-radius: 999px;
          box-shadow: 0 1px 4px rgba(0,0,0,.12), 0 0 0 1.5px rgba(0,0,0,.06);
          white-space: nowrap;
          cursor: pointer;
          transition: background 0.12s ease, color 0.12s ease, transform 0.12s ease, box-shadow 0.12s ease;
          line-height: 1;
          text-align: center;
          position: relative;
          transform-origin: center bottom;
        }
        .gn-price-marker:hover {
          background: #111;
          color: #fff;
          box-shadow: 0 4px 12px rgba(0,0,0,.22);
          transform: scale(1.06);
          z-index: 1000 !important;
        }
        .gn-price-marker.active {
          background: #111;
          color: #fff;
          box-shadow: 0 4px 14px rgba(0,0,0,.28);
          transform: scale(1.08);
          z-index: 1001 !important;
        }
        .gn-popup .leaflet-popup-content-wrapper {
          border-radius: 14px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.05);
          background: #fff;
          border: none;
        }
        .gn-popup .leaflet-popup-content {
          margin: 0;
          width: 268px !important;
          line-height: 1.4;
        }
        .gn-popup .leaflet-popup-tip-container {
          margin-top: -1px;
        }
        .gn-popup .leaflet-popup-tip {
          background: #fff;
          box-shadow: none;
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
        <a href="${item.link}" style="text-decoration:none;color:inherit;display:block;background:#fff;border-radius:14px;overflow:hidden;">
          ${item.image ? `<div style="width:100%;height:156px;overflow:hidden;position:relative;"><img src="${item.image}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.2s;" onerror="this.parentElement.style.display='none'" /></div>` : ""}
          <div style="padding:13px 15px 15px;">
            <div style="font-weight:600;font-size:13.5px;color:#111;line-height:1.3;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'DM Sans',system-ui,sans-serif;">${item.label}</div>
            <div style="font-size:11.5px;color:#888;margin-bottom:10px;font-family:'DM Sans',system-ui,sans-serif;">${item.subtitle}</div>
            <div style="display:flex;align-items:baseline;gap:4px;"><span style="font-weight:700;font-size:15px;color:#111;font-family:'DM Sans',system-ui,sans-serif;">${priceText}</span><span style="font-weight:400;font-size:12px;color:#999;font-family:'DM Sans',system-ui,sans-serif;">/ night</span></div>
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
