import {
  Firestore,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import type { Client, Dossier } from "./types";

type InstallationInput = Partial<Dossier["installation"]>;

export async function convertLeadToClient(
  db: Firestore,
  leadId: string,
  pack: Client["pack"],
  initialCredits: number,
  installationData?: InstallationInput
) {
  const now = serverTimestamp();
  const leadRef = doc(db, "leads", leadId);
  const clientsCol = collection(db, "clients");
  const dossiersCol = collection(db, "dossiers");
  const creditsCol = collection(db, "credits_transactions");
  const counterRef = doc(db, "counters", "dossiers");

  const result = await runTransaction(db, async (tx) => {
    const leadSnap = await tx.get(leadRef);
    if (!leadSnap.exists()) {
      throw new Error("Lead introuvable");
    }
    const lead = leadSnap.data();
    if (lead.status !== "qualifie") {
      throw new Error("Lead non qualifié");
    }

    const clientRef = doc(clientsCol);
    const clientId = clientRef.id;
    const dossierRef = doc(dossiersCol);
    const dossierId = dossierRef.id;

    const current = (await tx.get(counterRef)).data();
    const nextCounter = (current?.current as number | undefined) ?? 0;
    const nextValue = nextCounter + 1;
    tx.set(counterRef, { current: nextValue }, { merge: true });
    const year = new Date().getFullYear();
    const dossierRefStr = `DOS-${year}-${String(nextValue).padStart(4, "0")}`;

    tx.set(clientRef, {
      id: clientId,
      company: lead.company,
      contact_name: lead.contact_name,
      email: lead.email,
      phone: lead.phone,
      pack,
      credits: initialCredits,
      status: "active",
      lead_id: leadId,
      created_at: now,
      updated_at: now,
    } satisfies Client);

    const installation = {
      address: installationData?.address ?? lead.company ?? "Adresse à compléter",
      city: installationData?.city,
      postal_code: installationData?.postal_code,
      power_kwc: installationData?.power_kwc ?? 0,
      panels_count: installationData?.panels_count,
      inverter_type: installationData?.inverter_type,
      client_final_name: installationData?.client_final_name ?? lead.contact_name ?? "Client",
      client_final_phone: installationData?.client_final_phone ?? lead.phone,
      client_final_email: installationData?.client_final_email ?? lead.email,
    };

    tx.set(dossierRef, {
      id: dossierId,
      ref: dossierRefStr,
      client_id: clientId,
      installation,
      services: {
        dp_mairie: false,
        consuel: false,
        enedis: false,
        edf_oa: false,
      },
      status: "nouveau",
      steps: {},
      documents: [],
      timeline: [],
      notes: [],
      created_at: now,
      updated_at: now,
    } as Dossier);

    tx.update(leadRef, {
      status: "converti",
      converted_to: clientId,
      updated_at: now,
    });

    const creditRef = doc(creditsCol);
    tx.set(creditRef, {
      id: creditRef.id,
      client_id: clientId,
      type: "credit",
      amount: initialCredits,
      reason: "Initialisation pack",
      balance_after: initialCredits,
      created_at: now,
    });

    return { clientId, dossierId };
  });

  return result;
}
