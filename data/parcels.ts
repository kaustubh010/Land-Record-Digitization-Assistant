import data from "./data.json";

export interface ParcelProperties {
  plot_id: string;
  area_map: number;
  owner_name_map?: string;
  aadhaar_number?: string;
}

interface ParcelFeature {
  type: "Feature";
  properties: ParcelProperties;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

interface ParcelGeoJSON {
  type: "FeatureCollection";
  features: ParcelFeature[];
}

export const parcelsGeoJSON = data as ParcelGeoJSON;
