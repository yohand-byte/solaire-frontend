export type DpMeta = {
  issuerName?: string;
  issuerTagline?: string;
  ownerName?: string;
  projectTitle?: string;

  parcelRef?: string;
  powerKw?: string;
  surfaceM2?: string;
  panelType?: string;
  roofType?: string;
  orientation?: string;
  slope?: string;
};

export function withDefaultMeta(meta?: DpMeta): Required<DpMeta> {
  return {
    issuerName: meta?.issuerName || 'QUALIWATT',
    issuerTagline: meta?.issuerTagline || '',
    ownerName: meta?.ownerName || 'MAITRE D’OUVRAGE',
    projectTitle: meta?.projectTitle || 'Installation photovoltaique',

    parcelRef: meta?.parcelRef || 'XX 0000',
    powerKw: meta?.powerKw || '9 kWc',
    surfaceM2: meta?.surfaceM2 || '40 m2',
    panelType: meta?.panelType || 'Noirs mats',
    roofType: meta?.roofType || 'Tuiles',
    orientation: meta?.orientation || 'Sud',
    slope: meta?.slope || '30 degres',
  };
}
