export const PACKS = [
  { value: "validation", label: "Validation" },
  { value: "mise_en_service", label: "Mise en service" },
  { value: "zero_stress", label: "Zéro Stress" },
] as const;

export type PackValue = (typeof PACKS)[number]["value"];

export const FILE_STATUSES = [
  "nouveau",
  "en_attente",
  "incomplet",
  "en_cours",
  "bloque",
  "finalise",
  "clos",
  "gagne",
  "perdu",
] as const;

export type FileStatus = (typeof FILE_STATUSES)[number];

export const BADGE_CLASS: Record<string, string> = {
  gagne: "badge-success",
  finalise: "badge-success",
  clos: "badge-success",
  en_cours: "badge-warn",
  en_attente: "badge-warn",
  incomplet: "badge-warn",
  bloque: "badge-danger",
  perdu: "badge-danger",
};
