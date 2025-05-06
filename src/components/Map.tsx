import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import basketballCourts from '../data/basketball_courts.json';
import type { FeatureCollection, Point } from 'geojson';

// Use the environment variable for the access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

// Define type for basketball court properties
interface BasketballCourtProperties {
    id: string;
    name: string;
    description: string;
    courtType: string;
    hoops: number;
    surface: string;
}

// Type assertion for our GeoJSON data
const typedBasketballCourts = basketballCourts as FeatureCollection<Point, BasketballCourtProperties>;

const Map = () => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [mapError, setMapError] = useState<string | null>(null);

    useEffect(() => {
        if (map.current) return; // initialize map only once
        if (!mapContainer.current) return;

        // Check if token is available
        if (!mapboxgl.accessToken) {
            setMapError('Mapbox access token is missing. Please check your environment variables.');
            return;
        }

        try {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [139.7014, 35.6648], // Shibuya area coordinates
                zoom: 13
            });

            map.current.on('load', () => {
                console.log('Map loaded successfully');

                // Add the GeoJSON source for basketball courts
                if (map.current) {
                    map.current.addSource('basketball-courts', {
                        type: 'geojson',
                        data: typedBasketballCourts
                    });

                    // Add a layer for the basketball court points
                    map.current.addLayer({
                        id: 'basketball-courts-layer',
                        type: 'circle',
                        source: 'basketball-courts',
                        paint: {
                            'circle-radius': 8,
                            'circle-color': '#FF5733', // Orange color
                            'circle-stroke-width': 2,
                            'circle-stroke-color': '#ffffff'
                        }
                    });

                    // Add a layer for the labels
                    map.current.addLayer({
                        id: 'court-labels',
                        type: 'symbol',
                        source: 'basketball-courts',
                        layout: {
                            'text-field': ['get', 'name'],
                            'text-font': ['Open Sans Regular'],
                            'text-offset': [0, 1.5],
                            'text-anchor': 'top'
                        },
                        paint: {
                            'text-color': '#333',
                            'text-halo-color': '#fff',
                            'text-halo-width': 1
                        }
                    });

                    // Add popups on click
                    map.current.on('click', 'basketball-courts-layer', (e) => {
                        if (!e.features || e.features.length === 0 || !map.current) return;

                        const feature = e.features[0];
                        const props = feature.properties as BasketballCourtProperties;

                        // For Point geometries, we know the structure
                        const coordinates = (feature.geometry as Point).coordinates.slice() as [number, number];

                        // Create popup content
                        const popupContent = `
                            <h3>${props.name}</h3>
                            <p>${props.description}</p>
                            <ul>
                                <li><strong>Type:</strong> ${props.courtType}</li>
                                <li><strong>Hoops:</strong> ${props.hoops}</li>
                                <li><strong>Surface:</strong> ${props.surface}</li>
                            </ul>
                        `;

                        new mapboxgl.Popup()
                            .setLngLat(coordinates)
                            .setHTML(popupContent)
                            .addTo(map.current);
                    });

                    // Change cursor on hover
                    map.current.on('mouseenter', 'basketball-courts-layer', () => {
                        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
                    });

                    map.current.on('mouseleave', 'basketball-courts-layer', () => {
                        if (map.current) map.current.getCanvas().style.cursor = '';
                    });
                }
            });

            map.current.on('error', (e) => {
                console.error('Map error:', e);
                setMapError('Error loading map');
            });

            // Add navigation controls
            map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        } catch (error) {
            console.error('Error initializing map:', error);
            setMapError('Failed to initialize map');
        }

        // Clean up on unmount
        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div
                ref={mapContainer}
                style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0
                }}
            />
            {mapError && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(255, 0, 0, 0.1)',
                    padding: '1rem',
                    borderRadius: '4px',
                    color: 'red'
                }}>
                    {mapError}
                </div>
            )}
        </div>
    );
};

export default Map;
