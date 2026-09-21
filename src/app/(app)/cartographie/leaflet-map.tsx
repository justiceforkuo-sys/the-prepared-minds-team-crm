"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapClient } from "./cartographie-board";

// Icônes par défaut de Leaflet cassées sous bundler ESM — on pointe vers le CDN.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export function LeafletMap({ clients, showOwner }: { clients: MapClient[]; showOwner: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([50.5039, 4.4699], 8);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const markers = clients.map((c) => {
      const marker = L.marker([c.lat, c.lng], { icon: markerIcon }).addTo(map);
      const locationLine = [c.address, c.locality].filter(Boolean).join(", ");
      marker.bindPopup(
        `<b>${c.name}</b>${locationLine ? `<br>${locationLine}` : ""}${
          showOwner && c.owner ? `<br><span style="color:#8a97ab">${c.owner.name}</span>` : ""
        }`
      );
      return marker;
    });

    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="h-[70vh] w-full rounded-2xl border border-line" />;
}
