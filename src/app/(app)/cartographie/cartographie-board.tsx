"use client";

import dynamic from "next/dynamic";

export interface MapClient {
  id: string;
  name: string;
  address: string | null;
  locality: string | null;
  lat: number;
  lng: number;
  owner: { name: string } | null;
}

const LeafletMap = dynamic(() => import("./leaflet-map").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center rounded-2xl border border-line bg-card text-sm text-muted">
      Chargement de la carte...
    </div>
  ),
});

export function CartographieBoard({ clients, isAdmin }: { clients: MapClient[]; isAdmin: boolean }) {
  if (clients.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted">
        Aucun client géolocalisé pour l&apos;instant. Renseigne une adresse sur une fiche client pour qu&apos;elle
        apparaisse ici.
      </div>
    );
  }

  return <LeafletMap clients={clients} showOwner={isAdmin} />;
}
