export const PACKS = [
  { value: "essentiel", label: "Essentiel", price: 169 },
  { value: "pro", label: "Pro", price: 269 },
  { value: "serenite", label: "Sérénité", price: 449 },
  { value: "carte", label: "À la carte", price: 45 },
  // Legacy valeurs (conservation affichage/édition des anciens dossiers)
  { value: "validation", label: "Validation (legacy)", price: null },
  { value: "mise_en_service", label: "Mise en service (legacy)", price: null },
  { value: "zero_stress", label: "Zéro Stress (legacy)", price: null },
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
