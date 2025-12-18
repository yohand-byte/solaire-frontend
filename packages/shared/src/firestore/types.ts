import type { FieldValue, Timestamp } from "firebase/firestore";

export type FirestoreDate = Timestamp | FieldValue;

export interface Lead {
  id: string;
  source: "landing_sf" | "manual" | "import";
  company: string;
  contact_name: string;
  email: string;
  phone: string;
  message?: string;
  status: "nouveau" | "contacte" | "qualifie" | "converti" | "perdu";
  priority: "low" | "normal" | "high";
  assigned_to?: string;
  notes: Array<{ date: FirestoreDate; author: string; text: string }>;
  converted_to?: string;
  created_at: FirestoreDate;
  updated_at: FirestoreDate;
}

export interface Client {
  id: string;
  company: string;
  siret?: string;
  contact_name: string;
  email: string;
  phone: string;
  address?: { street: string; city: string; postal_code: string };
  pack: "essentiel" | "pro" | "serenite" | "flex";
  credits: number;
  status: "active" | "inactive" | "suspended";
  lead_id?: string;
  created_at: FirestoreDate;
  updated_at: FirestoreDate;
}

export type DossierStepStatus =
  | "non_demarre"
  | "en_cours"
  | "en_attente"
  | "valide"
  | "refuse";

export type DossierDocType = "dp_mairie" | "consuel" | "enedis" | "edf_oa" | "autre";

export interface DossierDocument {
  name: string;
  type: DossierDocType;
  url: string;
  uploaded_at: FirestoreDate;
  uploaded_by: string;
}

export interface DossierTimelineEntry {
  date: FirestoreDate;
  action: string;
  author: string;
  details?: string;
}

export interface DossierNote {
  date: FirestoreDate;
  author: string;
  text: string;
}

export interface Dossier {
  id: string;
  ref: string;
  client_id: string;
  installation: {
    address: string;
    city?: string;
    postal_code?: string;
    power_kwc: number;
    panels_count?: number;
    inverter_type?: "micro" | "string" | "hybrid";
    client_final_name: string;
    client_final_phone?: string;
    client_final_email?: string;
  };
  services: {
    dp_mairie: boolean;
    consuel: boolean;
    enedis: boolean;
    edf_oa: boolean;
  };
  status: "nouveau" | "en_cours" | "en_attente" | "termine" | "annule";
  steps: {
    dp_mairie?: DossierStepStatus;
    consuel?: DossierStepStatus;
    enedis?: DossierStepStatus;
    edf_oa?: DossierStepStatus;
  };
  documents: DossierDocument[];
  timeline: DossierTimelineEntry[];
  notes: DossierNote[];
  assigned_to?: string;
  created_at: FirestoreDate;
  updated_at: FirestoreDate;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "client";
  client_id?: string;
  permissions?: string[];
  created_at: FirestoreDate;
  last_login: FirestoreDate;
}

export interface CreditTransaction {
  id: string;
  client_id: string;
  type: "credit" | "debit";
  amount: number;
  reason: string;
  dossier_id?: string;
  balance_after: number;
  created_at: FirestoreDate;
}
