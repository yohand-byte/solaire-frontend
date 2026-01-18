import axios from 'axios';

export type ParcelInfo = {
  ref: string;
  section?: string;
  numero?: string;
  feuille?: string;
  commune?: string;
  insee?: string;
};

type CadastreFeature = {
  properties?: {
    numero?: string;
    feuille?: string;
    section?: string;
    nom_com?: string;
    code_insee?: string;
    idu?: string;
  };
};

export async function getParcelRef(
  lat: number,
  lon: number,
  _citycode?: string
): Promise<ParcelInfo | null> {
  const url = process.env.CADASTRE_API_URL || 'https://apicarto.ign.fr/api/cadastre/parcelle';

  try {
    const response = await axios.get(url, {
      params: {
        geom: JSON.stringify({
          type: 'Point',
          coordinates: [lon, lat],
        }),
      },
      timeout: 20000,
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      return null;
    }

    const feature = (response.data?.features?.[0] as CadastreFeature | undefined) || undefined;
    const props = feature?.properties;
    if (!props) {
      return null;
    }

    const section = props.section || '';
    const numero = props.numero || '';
    const ref = [section, numero].filter(Boolean).join(' ') || props.idu || '';
    if (!ref) {
      return null;
    }

    return {
      ref,
      section: section || undefined,
      numero: numero || undefined,
      feuille: props.feuille || undefined,
      commune: props.nom_com || undefined,
      insee: props.code_insee || undefined,
    };
  } catch {
    return null;
  }
}
