import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { LocationCoordinates } from '../types/location';

// You'll need to set this in your .env.local file
// PUBLIC_MAPBOX_TOKEN=your_token_here
const MAPBOX_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN as string | undefined;

// Safari-specific fix: Ensure token is set before any map operations
if (!MAPBOX_TOKEN || MAPBOX_TOKEN.trim() === '') {
  if (import.meta.env.DEV) {
    console.error('Mapbox token is missing or empty');
  }
} else if (import.meta.env.DEV) {
  console.log('Mapbox token loaded (prefix):', MAPBOX_TOKEN.substring(0, 20) + '...');
  console.log('Token length:', MAPBOX_TOKEN.length);
}

mapboxgl.accessToken = MAPBOX_TOKEN || '';

// Verify the token was set correctly
if (import.meta.env.DEV) {
  console.log('mapboxgl.accessToken after setting:', mapboxgl.accessToken?.substring(0, 20) + '...');
  console.log('Tokens match:', MAPBOX_TOKEN === mapboxgl.accessToken);
}

interface MapViewProps {
  location: LocationCoordinates | null;
  onMapLoad?: (map: mapboxgl.Map) => void;
}

export const MapView: React.FC<MapViewProps> = ({ location, onMapLoad }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Map already initialized

    try {
      if (import.meta.env.DEV) {
        console.log('Initializing Mapbox map...');
        console.log('Using token:', mapboxgl.accessToken?.substring(0, 20) + '...');
      }

      // Create map instance with Safari compatibility options
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: location ? [location.longitude, location.latitude] : [-74.006, 40.7128], // Default to NYC
        zoom: location ? 14 : 12,
        attributionControl: true,
        // Safari compatibility settings
        preserveDrawingBuffer: true, // Helps with Safari rendering
        refreshExpiredTiles: false, // Reduces requests that might fail in Safari
        crossSourceCollisions: false, // Disable collision detection across sources
        transformRequest: (url, resourceType) => {
          // Safari-specific: Ensure proper headers for API requests
          if (import.meta.env.DEV) {
            console.log('Transform request:', { url, resourceType });
          }

          // For Safari, explicitly add the access token as a query parameter
          // in addition to the header, as Safari sometimes strips headers
          if (url.includes('api.mapbox.com') && !url.includes('access_token=')) {
            const separator = url.includes('?') ? '&' : '?';
            return {
              url: `${url}${separator}access_token=${mapboxgl.accessToken}`,
            };
          }

          return { url };
        },
      });

      if (import.meta.env.DEV) {
        console.log('Map instance created successfully');
      }

      // Add navigation controls (zoom, rotation)
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add geolocate control (allows user to center on their location)
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
          },
          trackUserLocation: true,
          showUserHeading: true,
        }),
        'top-right'
      );

      // Call onMapLoad callback when map is ready
      map.current.on('load', () => {
        if (map.current && onMapLoad) {
          onMapLoad(map.current);
        }
      });

      // Handle map errors
      map.current.on('error', (e) => {
        if (import.meta.env.DEV) {
          console.error('Mapbox error:', e);
          const errorObj = e.error as any; // Mapbox error object structure
          console.error('Error details:', {
            message: errorObj?.message,
            status: errorObj?.status,
            url: errorObj?.url,
          });
        }

        const errorObj = e.error as any; // Mapbox error object structure

        // More specific error messages
        if (errorObj?.message?.includes('401') || errorObj?.status === 401) {
          setMapError('Invalid Mapbox token. Please check your token.');
        } else if (errorObj?.message?.includes('load') || errorObj?.message?.includes('fetch')) {
          setMapError('Failed to load map tiles. Check your internet connection and Safari settings.');
        } else {
          setMapError(`Failed to load map: ${errorObj?.message || 'Unknown error'}`);
        }
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error initializing map:', error);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMapError(`Failed to initialize map: ${errorMessage}`);
    }

    // Cleanup
    return () => {
      if (marker.current) {
        marker.current.remove();
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onMapLoad]);

  // Update map when location changes
  useEffect(() => {
    if (!map.current || !location) return;

    const { longitude, latitude } = location;

    // Remove existing marker
    if (marker.current) {
      marker.current.remove();
    }

    // Create a new marker at the user's location
    marker.current = new mapboxgl.Marker({
      color: '#3b82f6', // Blue color
      draggable: false,
    })
      .setLngLat([longitude, latitude])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div style="padding: 8px;">
            <strong>Your Location</strong><br/>
            <small>Lat: ${latitude.toFixed(6)}<br/>
            Lng: ${longitude.toFixed(6)}<br/>
            Accuracy: ±${location.accuracy.toFixed(0)}m</small>
          </div>`
        )
      )
      .addTo(map.current);

    // Center map on the new location with animation
    map.current.flyTo({
      center: [longitude, latitude],
      zoom: 14,
      duration: 1500,
      essential: true,
    });
  }, [location]);

  if (mapError) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        color: '#ef4444',
        padding: '20px',
        textAlign: 'center',
      }}>
        <div>
          <p>{mapError}</p>
          <p style={{ fontSize: '0.875rem', marginTop: '8px', color: '#6b7280' }}>
            Make sure PUBLIC_MAPBOX_TOKEN is set in your .env.local file
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  );
};
