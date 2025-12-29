import axios from 'axios';
import proj4 from 'proj4';

export type GeoPoint = {
  lat: number;
  lon: number;
};

export type GeocodeResult = GeoPoint & {
  label: string;
  city?: string;
  postcode?: string;
  citycode?: string;
};

export type LambertPoint = {
  x: number;
  y: number;
};

const EPSG_4326 = 'EPSG:4326';
const EPSG_2154 = 'EPSG:2154';

// Lambert-93 (EPSG:2154) definition.
proj4.defs(
  EPSG_2154,
  '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 ' +
    '+lon_0=3 +x_0=700000 +y_0=6600000 ' +
    '+ellps=GRS80 +units=m +no_defs'
);

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const url = 'https://api-adresse.data.gouv.fr/search/';
  const response = await axios.get(url, {
    params: { q: address, limit: 1 },
    timeout: 15000,
  });

  const data = response.data;
  if (!data?.features?.length) {
    throw new Error('Adresse non trouvee');
  }

  const feature = data.features[0];
  const [lon, lat] = feature.geometry.coordinates;
  const props = feature.properties || {};

  return {
    lat,
    lon,
    label: props.label || address,
    city: props.city,
    postcode: props.postcode,
    citycode: props.citycode,
  };
}

export function toLambert93(point: GeoPoint): LambertPoint {
  const [x, y] = proj4(EPSG_4326, EPSG_2154, [point.lon, point.lat]);
  return { x, y };
}

export function fromLambert93(point: LambertPoint): GeoPoint {
  const [lon, lat] = proj4(EPSG_2154, EPSG_4326, [point.x, point.y]);
  return { lat, lon };
}
