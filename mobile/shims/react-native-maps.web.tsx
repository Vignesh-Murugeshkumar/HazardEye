import React, {
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
  createContext,
  useContext,
} from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { GOOGLE_MAPS_API_KEY } from '../constants';

// ─── Google Maps JS API loader ────────────────────────────
let gmapsLoaded = false;
let gmapsLoadPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (gmapsLoaded && (window as any).google?.maps) return Promise.resolve();
  if (gmapsLoadPromise) return gmapsLoadPromise;

  gmapsLoadPromise = new Promise<void>((resolve, reject) => {
    if ((window as any).google?.maps) {
      gmapsLoaded = true;
      return resolve();
    }

    const callbackName = '__gmapsCallback_' + Date.now();
    (window as any)[callbackName] = () => {
      gmapsLoaded = true;
      delete (window as any)[callbackName];
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=${callbackName}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      delete (window as any)[callbackName];
      reject(new Error('Failed to load Google Maps'));
    };
    document.head.appendChild(script);
  });
  return gmapsLoadPromise;
}

// ─── Context so Marker / Circle children can access the Google Map ───
const MapContext = createContext<React.MutableRefObject<any | null> | null>(null);

// ─── Helpers ──────────────────────────────────────────────
function getZoomFromDelta(latDelta?: number): number {
  if (!latDelta || latDelta <= 0) return 14;
  return Math.round(Math.log2(360 / latDelta));
}

// ─── MapView ──────────────────────────────────────────────
const MapView = React.forwardRef<any, any>(
  ({ children, style, initialRegion, showsUserLocation, onPress, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapObjRef = useRef<any>(null);
    const userMarkerRef = useRef<any>(null);
    const [mapReady, setMapReady] = useState(false);
    const [loadError, setLoadError] = useState(false);

    useImperativeHandle(ref, () => ({
      animateToRegion: (region: any, _duration?: number) => {
        if (mapObjRef.current) {
          mapObjRef.current.panTo({
            lat: region.latitude,
            lng: region.longitude,
          });
          if (region.latitudeDelta) {
            mapObjRef.current.setZoom(getZoomFromDelta(region.latitudeDelta));
          }
        }
      },
      fitToCoordinates: (coords: any[], _options?: any) => {
        if (mapObjRef.current && coords?.length) {
          const gm = (window as any).google.maps;
          const bounds = new gm.LatLngBounds();
          coords.forEach((c: any) => bounds.extend({ lat: c.latitude, lng: c.longitude }));
          mapObjRef.current.fitBounds(bounds, 40);
        }
      },
      getCamera: async () => {
        if (!mapObjRef.current) return {};
        const c = mapObjRef.current.getCenter();
        return {
          center: { latitude: c?.lat() ?? 0, longitude: c?.lng() ?? 0 },
          zoom: mapObjRef.current.getZoom(),
        };
      },
      setCamera: () => {},
    }));

    useEffect(() => {
      let destroyed = false;

      loadGoogleMaps()
        .then(() => {
          if (destroyed || !containerRef.current) return;

          const gm = (window as any).google.maps;
          const lat = initialRegion?.latitude ?? 19.076;
          const lng = initialRegion?.longitude ?? 72.8777;
          const zoom = initialRegion
            ? getZoomFromDelta(initialRegion.latitudeDelta)
            : 14;

          const map = new gm.Map(containerRef.current!, {
            center: { lat, lng },
            zoom,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            gestureHandling: 'greedy',
            styles: [
              { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
            ],
          });

          // User location blue dot
          if (showsUserLocation && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                if (destroyed) return;
                userMarkerRef.current = new gm.Marker({
                  position: {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                  },
                  map,
                  icon: {
                    path: gm.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#4285F4',
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 3,
                  },
                  title: 'You are here',
                  zIndex: 999,
                });
              },
              () => {}
            );
          }

          // Forward map clicks
          if (onPress) {
            map.addListener('click', (e: any) => {
              if (e.latLng) {
                onPress({
                  nativeEvent: {
                    coordinate: {
                      latitude: e.latLng.lat(),
                      longitude: e.latLng.lng(),
                    },
                  },
                });
              }
            });
          }

          mapObjRef.current = map;
          setMapReady(true);
        })
        .catch(() => {
          if (!destroyed) setLoadError(true);
        });

      return () => {
        destroyed = true;
        if (userMarkerRef.current) {
          userMarkerRef.current.setMap(null);
          userMarkerRef.current = null;
        }
        mapObjRef.current = null;
      };
    }, []);

    if (loadError) {
      return (
        <View style={[wrapStyles.container, style]}>
          <Text style={wrapStyles.errorText}>Failed to load Google Maps</Text>
        </View>
      );
    }

    return (
      <View style={[{ flex: 1, position: 'relative' }, style]}>
        <div ref={containerRef as any} style={{ position: 'absolute', inset: 0 }} />
        {!mapReady && (
          <View style={wrapStyles.loading}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
        )}
        <MapContext.Provider value={mapObjRef}>
          {mapReady ? children : null}
        </MapContext.Provider>
      </View>
    );
  }
);
MapView.displayName = 'MapView';

// ─── Marker ────────────────────────────────────────────────
const Marker = ({ coordinate, pinColor, onPress, title, description, children }: any) => {
  const mapRef = useContext(MapContext);
  const markerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef?.current || !coordinate) return;

    const gm = (window as any).google.maps;
    const color = pinColor || '#DC3545';

    const marker = new gm.Marker({
      position: { lat: coordinate.latitude, lng: coordinate.longitude },
      map: mapRef.current,
      icon: {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z',
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        scale: 1.6,
        anchor: new gm.Point(12, 22),
      },
      title: title || undefined,
      optimized: true,
    });

    if (title || description) {
      const infoWindow = new gm.InfoWindow({
        content: `<div style="font-family:system-ui,sans-serif;padding:4px;max-width:200px">
          ${title ? `<b style="font-size:14px">${title}</b>` : ''}
          ${description ? `<p style="margin:4px 0 0;font-size:12px;color:#555">${description}</p>` : ''}
        </div>`,
      });
      infoWindowRef.current = infoWindow;
    }

    if (onPress) {
      marker.addListener('click', () => {
        onPress({
          nativeEvent: {
            coordinate: {
              latitude: coordinate.latitude,
              longitude: coordinate.longitude,
            },
          },
        });
      });
    }

    markerRef.current = marker;

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        (window as any).google?.maps?.event?.clearInstanceListeners(markerRef.current);
        markerRef.current = null;
      }
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
    };
  }, [coordinate?.latitude, coordinate?.longitude, pinColor]);

  return null;
};

// ─── Circle ────────────────────────────────────────────────
const Circle = ({ center, radius, strokeColor, fillColor, strokeWidth, fillOpacity }: any) => {
  const mapRef = useContext(MapContext);
  const circleRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef?.current || !center) return;

    const gm = (window as any).google.maps;

    const circle = new gm.Circle({
      center: { lat: center.latitude, lng: center.longitude },
      radius: radius || 100,
      strokeColor: strokeColor || '#DC3545',
      strokeWeight: strokeWidth || 2,
      fillColor: fillColor || 'rgba(220,53,69,0.2)',
      fillOpacity: fillOpacity ?? 0.25,
      map: mapRef.current,
    });
    circleRef.current = circle;

    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, [center?.latitude, center?.longitude, radius, strokeColor, fillColor]);

  return null;
};

// ─── Constants ─────────────────────────────────────────────
const PROVIDER_GOOGLE = 'google';

// ─── Styles ────────────────────────────────────────────────
const wrapStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#666',
    fontSize: 16,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 10,
  },
});

export default MapView;
export { Marker, Circle, PROVIDER_GOOGLE };
