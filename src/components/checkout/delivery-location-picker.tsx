'use client';

import { useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type LocationValue = {
  lat: number;
  lng: number;
  address: string;
};

type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
};

const MARACAIBO_CENTER = {
  lat: 10.6427,
  lng: -71.6125,
};

export function DeliveryLocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
}) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);
  const valueRef = useRef(value);
  const [query, setQuery] = useState('Maracaibo');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    let isMounted = true;

    async function setupMap() {
      if (!mapElementRef.current || mapRef.current) return;

      const leaflet = await import('leaflet');
      if (!isMounted || !mapElementRef.current) return;

      const icon = leaflet.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      const map = leaflet
        .map(mapElementRef.current, {
          center: [value.lat, value.lng],
          zoom: 13,
          zoomControl: false,
          attributionControl: false,
        })
        .setView([value.lat, value.lng], 13);

      leaflet
        .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        })
        .addTo(map);

      leaflet.control.zoom({ position: 'bottomright' }).addTo(map);
      leaflet.control.attribution({ prefix: false }).addTo(map);

      const marker = leaflet
        .marker([value.lat, value.lng], { draggable: true, icon })
        .addTo(map);

      marker.on('dragend', () => {
        const point = marker.getLatLng();
        onChange({
          ...valueRef.current,
          lat: Number(point.lat.toFixed(7)),
          lng: Number(point.lng.toFixed(7)),
        });
      });

      map.on('click', (event: import('leaflet').LeafletMouseEvent) => {
        const point = event.latlng;
        marker.setLatLng(point);
        onChange({
          ...valueRef.current,
          lat: Number(point.lat.toFixed(7)),
          lng: Number(point.lng.toFixed(7)),
        });
      });

      mapRef.current = map;
      markerRef.current = marker;
    }

    setupMap();

    return () => {
      isMounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const nextLatLng: [number, number] = [value.lat, value.lng];
    markerRef.current.setLatLng(nextLatLng);
    mapRef.current.setView(nextLatLng, Math.max(mapRef.current.getZoom(), 13));
  }, [value.lat, value.lng]);

  async function searchLocation() {
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsSearching(true);
    try {
      const searchParams = new URLSearchParams({
        format: 'json',
        limit: '5',
        countrycodes: 've',
        q: `${trimmed}, Venezuela`,
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${searchParams}`);
      if (!response.ok) throw new Error('No se pudo buscar la ubicacion');
      const payload = (await response.json()) as SearchResult[];
      setResults(payload);
    } finally {
      setIsSearching(false);
    }
  }

  function useBrowserLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      onChange({
        ...valueRef.current,
        lat: Number(position.coords.latitude.toFixed(7)),
        lng: Number(position.coords.longitude.toFixed(7)),
      });
    });
  }

  function selectResult(result: SearchResult) {
    const lat = Number(Number(result.lat).toFixed(7));
    const lng = Number(Number(result.lon).toFixed(7));
    onChange({
      lat,
      lng,
      address: result.display_name,
    });
    setResults([]);
    setQuery(result.display_name);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="checkout-input pl-10 font-sans text-xs font-bold uppercase tracking-wider"
            placeholder="BUSCAR URBANIZACION, CALLE O REFERENCIA"
          />
        </div>
        <button
          type="button"
          onClick={searchLocation}
          disabled={isSearching}
          className="min-h-[44px] border border-white/10 px-4 text-xs font-black uppercase tracking-widest text-white transition-colors hover:border-white/30 disabled:opacity-50"
        >
          Buscar
        </button>
        <button
          type="button"
          onClick={useBrowserLocation}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 border border-white/10 px-4 text-xs font-black uppercase tracking-widest text-white transition-colors hover:border-white/30"
        >
          <LocateFixed className="h-4 w-4" />
          GPS
        </button>
      </div>

      {results.length > 0 && (
        <div className="divide-y divide-white/5 border border-white/10 bg-zinc-950">
          {results.map((result) => (
            <button
              key={`${result.lat}-${result.lon}-${result.display_name}`}
              type="button"
              onClick={() => selectResult(result)}
              className="flex w-full items-start gap-2 p-3 text-left text-[11px] font-bold uppercase leading-5 tracking-wider text-zinc-300 transition-colors hover:bg-white hover:text-zinc-950"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
              {result.display_name}
            </button>
          ))}
        </div>
      )}

      <div
        ref={mapElementRef}
        className="h-[280px] overflow-hidden border border-white/10 bg-zinc-900"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          readOnly
          value={value.lat.toFixed(7)}
          className="checkout-input font-mono text-xs font-bold uppercase tracking-wider"
          aria-label="Latitud"
        />
        <input
          readOnly
          value={value.lng.toFixed(7)}
          className="checkout-input font-mono text-xs font-bold uppercase tracking-wider"
          aria-label="Longitud"
        />
      </div>

      <textarea
        required
        value={value.address}
        onChange={(event) => onChange({ ...value, address: event.target.value })}
        className={cn(
          'checkout-input min-h-[96px] resize-y py-3 font-sans text-xs font-bold uppercase leading-5 tracking-wider',
        )}
        placeholder="DIRECCION EXACTA, PUNTO DE REFERENCIA, APARTAMENTO O AGENCIA MRW/ZOOM"
      />
    </div>
  );
}
