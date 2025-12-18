import { auth, db } from "../firebase";
import * as shared from "@shared/firestore";

export type {
  Lead,
  Client,
  Dossier,
  DossierDocument,
  DossierTimelineEntry,
  DossierNote,
  DossierDocType,
  DossierStepStatus,
  User,
  CreditTransaction,
  FirestoreDate,
} from "@shared/firestore";

export const createLead = (data: Parameters<typeof shared.createLead>[1]) =>
  shared.createLead(db, data);
export const getLead = (id: string) => shared.getLead(db, id);
export const getLeads = (filters?: Parameters<typeof shared.getLeads>[1]) =>
  shared.getLeads(db, filters);
export const updateLead = (id: string, data: Parameters<typeof shared.updateLead>[2]) =>
  shared.updateLead(db, id, data);
export const deleteLead = (id: string) => shared.deleteLead(db, id);

export const createClient = (data: Parameters<typeof shared.createClient>[1]) =>
  shared.createClient(db, data);
export const getClient = (id: string) => shared.getClient(db, id);
export const getClients = (filters?: Parameters<typeof shared.getClients>[1]) =>
  shared.getClients(db, filters);
export const updateClient = (id: string, data: Parameters<typeof shared.updateClient>[2]) =>
  shared.updateClient(db, id, data);

export const getNextDossierRef = () => shared.getNextDossierRef(db);
export const createDossier = (data: Parameters<typeof shared.createDossier>[1]) =>
  shared.createDossier(db, data);
export const getDossier = (id: string) => shared.getDossier(db, id);
export const getDossiersByClient = (clientId: string) =>
  shared.getDossiersByClient(db, clientId);
export const getDossiers = (filters?: Parameters<typeof shared.getDossiers>[1]) =>
  shared.getDossiers(db, filters);
export const updateDossier = (id: string, data: Parameters<typeof shared.updateDossier>[2]) =>
  shared.updateDossier(db, id, data);
export const addDossierDocument = (
  dossierId: string,
  document: Parameters<typeof shared.addDossierDocument>[2]
) => shared.addDossierDocument(db, dossierId, document);
export const addDossierTimelineEntry = (
  dossierId: string,
  entry: Parameters<typeof shared.addDossierTimelineEntry>[2]
) => shared.addDossierTimelineEntry(db, dossierId, entry);

export const createUser = (uid: string, data: Parameters<typeof shared.createUser>[2]) =>
  shared.createUser(db, uid, data);
export const getUser = (uid: string) => shared.getUser(db, uid);
export const updateUser = (uid: string, data: Parameters<typeof shared.updateUser>[2]) =>
  shared.updateUser(db, uid, data);

export const addCredits = (clientId: string, amount: number, reason: string) =>
  shared.addCredits(db, clientId, amount, reason);
export const debitCredits = (
  clientId: string,
  amount: number,
  reason: string,
  dossierId?: string
) => shared.debitCredits(db, clientId, amount, reason, dossierId);
export const getCreditsHistory = (clientId: string) =>
  shared.getCreditsHistory(db, clientId);

export const convertLeadToClient = (
  leadId: string,
  pack: Parameters<typeof shared.convertLeadToClient>[2],
  initialCredits: number,
  installationData?: Parameters<typeof shared.convertLeadToClient>[4]
) => shared.convertLeadToClient(db, leadId, pack, initialCredits, installationData);

export const ensureUserDoc = (
  data: Parameters<typeof shared.ensureUserDoc>[2],
  uid?: string
) => {
  const userId = uid ?? auth.currentUser?.uid;
  if (!userId) throw new Error("Utilisateur non authentifié");
  return shared.ensureUserDoc(db, userId, data);
};

export const findClientIdByEmail = (email: string | null | undefined) =>
  shared.findClientIdByEmail(db, email);
