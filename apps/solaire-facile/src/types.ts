import { Timestamp } from "firebase/firestore";

export type Dossier = {
  id: string;
  titre?: string;
  statut?: string;
  installerId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type Installer = {
  id: string;
  email?: string | null;
  status?: string;
  company?: string;
  createdAt?: Timestamp;
};
