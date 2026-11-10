import React, { useEffect, useState } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef,
  useMapsLibrary,
  useMap,
} from '@vis.gl/react-google-maps';
import { MapPin, Navigation } from 'lucide-react';

interface StudioMapProps {
  locationQuery: string;
}

interface ResolvedPlaceInfo {
  lat: number;
  lng: number;
  displayName: string;
  formattedAddress: string;
  googleMapsUri?: string;
}

const PlacesResolver: React.FC<{
  query: string;
  onResolved: (info: ResolvedPlaceInfo) => void;
}> = ({ query, onResolved }) => {
  const placesLib = useMapsLibrary('places');
  const map = useMap();

  useEffect(() => {
    if (!placesLib || !query) return;

    let cancelled = false;
    const resolveLocation = async () => {
      try {
        // Modern Places API (New): Place.searchByText
        // Doc: https://developers.google.com/maps/documentation/javascript/place-search?utm_campaign=gmp_mcp_codeassist_v1_aistudio
        const { places } = await placesLib.Place.searchByText({
          textQuery: query,
          fields: ['displayName', 'formattedAddress', 'location', 'googleMapsURI'],
          maxResultCount: 1,
        });

        const firstPlace = places?.[0];
        if (!cancelled && firstPlace?.location) {
          const lat = firstPlace.location.lat();
          const lng = firstPlace.location.lng();
          onResolved({
            lat,
            lng,
            displayName: firstPlace.displayName || 'Ota, Ogun State',
            formattedAddress: firstPlace.formattedAddress || query,
            googleMapsUri: firstPlace.googleMapsURI || undefined,
          });
          if (map) {
            map.panTo({ lat, lng });
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('OVER_QUERY_LIMIT') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('429') ||
          msg.includes('Quota')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      }
    };

    resolveLocation();
    return () => {
      cancelled = true;
    };
  }, [placesLib, query, map, onResolved]);

  return null;
};

export const StudioMap: React.FC<StudioMapProps> = ({ locationQuery }) => {
  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    (process.env.GOOGLE_MAPS_API_KEY as string) ||
    '';

  const [placeInfo, setPlaceInfo] = useState<ResolvedPlaceInfo | null>(null);
  const [infoOpen, setInfoOpen] = useState(true);
  const [markerRef, marker] = useAdvancedMarkerRef();

  // Initial map viewport center before Places API resolves exact coordinates
  const initialViewportCenter = { lat: 6.68, lng: 3.23 };
  const activePosition = placeInfo
    ? { lat: placeInfo.lat, lng: placeInfo.lng }
    : initialViewportCenter;

  if (!apiKey) {
    return (
      <div className="h-[420px] w-full rounded-2xl border border-white/10 bg-[#151515] flex flex-col items-center justify-center p-8 text-center">
        <MapPin className="w-10 h-10 text-[#D4AF70] mb-3 stroke-[1.5]" />
        <h3 className="font-serif-display text-2xl font-semibold text-white">
          CAREMEDIA Studio Location
        </h3>
        <p className="text-sm text-zinc-400 mt-1 max-w-md">{locationQuery}</p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#D4AF70] text-[#080808] rounded-lg hover:bg-[#e2c186] transition-colors whitespace-nowrap shrink-0"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Open in Google Maps</span>
        </a>
      </div>
    );
  }

  return (
    <div className="relative h-[420px] w-full rounded-2xl overflow-hidden border border-white/10 bg-[#151515]">
      <APIProvider apiKey={apiKey} libraries={['places', 'marker']} region="NG" language="en">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={initialViewportCenter}
          defaultZoom={13}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          className="w-full h-full"
        >
          <PlacesResolver query={locationQuery} onResolved={setPlaceInfo} />

          <AdvancedMarker
            ref={markerRef}
            position={activePosition}
            onClick={() => setInfoOpen(true)}
            title="CAREMEDIA Studio"
          >
            <Pin
              background="#D4AF70"
              borderColor="#080808"
              glyphColor="#080808"
              scale={1.25}
            />
          </AdvancedMarker>

          {infoOpen && marker && (
            <InfoWindow
              anchor={marker}
              maxWidth={260}
              onCloseClick={() => setInfoOpen(false)}
            >
              <div className="text-zinc-900 p-1">
                <p className="font-bold text-sm">CAREMEDIA Studio</p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  {placeInfo ? placeInfo.formattedAddress : locationQuery}
                </p>
                {placeInfo?.googleMapsUri && (
                  <a
                    href={placeInfo.googleMapsUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1.5 text-xs font-semibold text-amber-700 underline"
                  >
                    View on Google Maps
                  </a>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </APIProvider>
    </div>
  );
};
