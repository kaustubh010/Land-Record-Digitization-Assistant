import { useEffect, useRef, useCallback, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { parcelsGeoJSON, ParcelProperties } from "@/data/parcels";
import { matchParcel, getStatusColor, getStatusLabel, ParcelMatchResult } from "@/lib/matching";
import { LandRecord } from "@/data/records";

interface ParcelMapProps {
  searchedPlotIds: string[] | null;
  onParcelClick: (result: ParcelMatchResult) => void;
  onSearchComplete?: () => void; // Add callback to reset search
  records: LandRecord[];
}

export default function ParcelMap({ searchedPlotIds, onParcelClick, onSearchComplete, records }: ParcelMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);

  // Center coordinates for the village
  const center: [number, number] = [12.9700, 77.5960];

  // Style function for each parcel based on match status
  const getFeatureStyle = useCallback((feature: GeoJSON.Feature | undefined, isSelected: boolean) => {
    if (!feature?.properties) return {};
    
    const props = feature.properties as ParcelProperties;
    const matchResult = matchParcel(props, records);
    const color = getStatusColor(matchResult.status);
    
    return {
      fillColor: color,
      fillOpacity: isSelected ? 0.8 : 0.5,
      color: isSelected ? "#1e40af" : "#374151",
      weight: isSelected ? 4 : 2,
      opacity: 1
    };
  }, [records]);

  // Initialize the map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: 16,
      scrollWheelZoom: true
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    const style = document.createElement("style");
  style.innerHTML = `
    .leaflet-interactive {
      outline: none !important;
    }
  `;
  document.head.appendChild(style);


    mapRef.current = map;

    // Cleanup on unmount
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const allCoords: L.LatLngExpression[] = [];

    parcelsGeoJSON.features.forEach(feature => {
      if (feature.geometry.type === "Polygon") {
        const coords = feature.geometry.coordinates[0] as [number, number][];
        coords.forEach(([lng, lat]) => allCoords.push([lat, lng]));
      }
    });

    // Add dynamic parcels from database records
    records.forEach(record => {
      if (record.north && record.south && record.east && record.west) {
        allCoords.push([record.north, record.west]);
        allCoords.push([record.north, record.east]);
        allCoords.push([record.south, record.east]);
        allCoords.push([record.south, record.west]);
      }
    });

    if (allCoords.length) {
      mapRef.current.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50] });
    }
  }, [records]);

  // Center on searched parcels and select them
  useEffect(() => {
    if (!mapRef.current || !searchedPlotIds || searchedPlotIds.length === 0) return;

    const allLatLngs: L.LatLng[] = [];
    const matchResults: ParcelMatchResult[] = [];

    searchedPlotIds.forEach(plotId => {
      const feature = parcelsGeoJSON.features.find(
        f => f.properties.plot_id === plotId
      );

      if (feature && feature.geometry.type === "Polygon") {
        const coords = feature.geometry.coordinates[0] as [number, number][];
        const latLngs = coords.map(([lng, lat]) => L.latLng(lat, lng));
        allLatLngs.push(...latLngs);
        
        const props = feature.properties as ParcelProperties;
        const matchResult = matchParcel(props, records);
        matchResults.push(matchResult);
      }
    });

    if (allLatLngs.length > 0) {
      const bounds = L.latLngBounds(allLatLngs);
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
      
      // Select all the parcels
      setSelectedPlotIds(searchedPlotIds);
      
      // Trigger the click handler for the first parcel
      if (matchResults.length > 0) {
        onParcelClick(matchResults[0]);
      }
      
      // Reset the search after handling
      if (onSearchComplete) {
        onSearchComplete();
      }
    }
  }, [searchedPlotIds, onParcelClick, onSearchComplete, records]);

  // Add GeoJSON layer and handle updates
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing layer if present
    if (geoJsonLayerRef.current) {
      mapRef.current.removeLayer(geoJsonLayerRef.current);
    }

    // Combine static features with dynamic features from records (database parcels with coordinates)
    const combinedFeatures = [...parcelsGeoJSON.features];
    
    records.forEach(record => {
      // If record has coordinates and isn't already in the static map
      if (record.north && record.south && record.east && record.west) {
        const alreadyExists = combinedFeatures.some(f => f.properties.plot_id === record.plot_id);
        
        if (!alreadyExists) {
          // Create a dynamic feature for the map
          combinedFeatures.push({
            type: "Feature",
            properties: {
              plot_id: record.plot_id,
              area_map: record.area_record,
              owner_name_map: record.owner_name
            },
            geometry: {
              type: "Polygon",
              coordinates: [[
                [record.west, record.north],
                [record.east, record.north],
                [record.east, record.south],
                [record.west, record.south],
                [record.west, record.north]
              ]]
            }
          } as any);
        }
      }
    });

    const featureCollection = {
      type: "FeatureCollection",
      features: combinedFeatures
    };

    // Create new GeoJSON layer
    const geoJsonLayer = L.geoJSON(featureCollection as GeoJSON.FeatureCollection, {
      style: (feature) => {
        const isSelected = feature?.properties?.plot_id && selectedPlotIds.includes(feature.properties.plot_id);
        return getFeatureStyle(feature, isSelected);
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties as ParcelProperties;
        const matchResult = matchParcel(props, records);

        // Create popup content
        const popupContent = `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">${props.plot_id}</h3>
            <div style="font-size: 14px;">
              <p><strong>Area (Map):</strong> ${Number(props.area_map).toFixed(2)} ha</p>
              ${matchResult.area_record !== undefined 
                ? `<p><strong>Area (Records):</strong> ${matchResult.area_record.toFixed(2)} ha</p>` 
                : '<p style="color: #6b7280;">No record found</p>'
              }
              ${matchResult.areaDifference !== undefined 
                ? `<p><strong>Difference:</strong> ${matchResult.areaDifference.toFixed(1)}%</p>` 
                : ''
              }
              <p style="margin-top: 8px;">
                <span style="padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px; background-color: ${getStatusColor(matchResult.status)}">
                  ${getStatusLabel(matchResult.status)}
                </span>
              </p>
            </div>
          </div>
        `;

        layer.bindPopup(popupContent);

          // Add tooltip for hover
        const tooltipContent = `
          <div style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; min-width: 180px; padding: 4px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #111827;">${props.plot_id}</div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; color: #374151;">
              <span>Map Area:</span>
              <span style="font-weight: 500;">${Number(props.area_map).toFixed(2)} ha</span>
            </div>
             ${matchResult.area_record !== undefined 
                ? `<div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; color: #374151;">
                     <span>Record Area:</span>
                     <span style="font-weight: 500;">${matchResult.area_record.toFixed(2)} ha</span>
                   </div>` 
                : ''
              }
            ${props.owner_name_map ? `<div style="font-size: 11px; color: #6b7280; margin-top: 4px; border-top: 1px solid #e5e7eb; padding-top: 4px;">Owner: ${props.owner_name_map}</div>` : ''}
            <div style="margin-top: 6px;">
              <span style="padding: 2px 6px; border-radius: 9999px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: white; background-color: ${getStatusColor(matchResult.status)}">
                ${getStatusLabel(matchResult.status)}
              </span>
            </div>
          </div>
        `;
        layer.bindTooltip(tooltipContent, {
          sticky: true,
          opacity: 0.9
        });

        // Handle click to show details in sidebar
        layer.on('click', () => {
          setSelectedPlotIds([props.plot_id]);
          onParcelClick(matchResult);
        });

        // Highlight on hover
        layer.on('mouseover', (e) => {
          const l = e.target as L.Path;
          l.setStyle({
            weight: 3,
            fillOpacity: 0.7
          });
        });

        layer.on('mouseout', (e) => {
          const l = e.target as L.Path;
          const isSelected = selectedPlotIds.includes(props.plot_id);
          l.setStyle(getFeatureStyle(feature, isSelected));
        });
      }
    });

    geoJsonLayer.addTo(mapRef.current);
    geoJsonLayerRef.current = geoJsonLayer;

  }, [selectedPlotIds, onParcelClick, getFeatureStyle, records]);

  return (
    <div 
      ref={mapContainerRef} 
      className="h-full w-full rounded-lg z-0"
      style={{ minHeight: "400px" }}
    />
  );
}