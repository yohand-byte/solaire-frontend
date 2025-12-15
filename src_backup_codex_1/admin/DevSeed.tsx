import { useState } from "react";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { useAuth } from "../hooks/useAuth";
import { db, createFileSafeClient } from "../lib/firestore";

export default function DevSeed() {
  const { user, claims, loading } = useAuth();
  const [status, setStatus] = useState<string>("");
  const [running, setRunning] = useState(false);

  if (loading) return null;
  if (!user || claims?.role !== "admin") return <div className="card">Accès admin requis</div>;

  const seed = async () => {
    setRunning(true);
    setStatus("Seeding…");
    let leads = 0, clients = 0, files = 0;
    try {
      // Leads
      const leadData = [
        { name: "Alice Photon", email: "alice@test.com", phone: "0600000001", source: "landing", createdAt: Timestamp.now() },
        { name: "Bob Solaire", email: "bob@test.com", phone: "0600000002", source: "partenaire", createdAt: Timestamp.fromDate(new Date(Date.now() - 2 * 86400000)) },
        { name: "Charlie Watt", email: "charlie@test.com", phone: "0600000003", source: "landing", createdAt: Timestamp.fromDate(new Date(Date.now() - 5 * 86400000)) },
      ];
      for (const l of leadData) { await addDoc(collection(db, "leads"), l); leads++; }

      // Clients
      const clientData = [
        { name: "Installateur Alpha", email: "contact@alpha.com", phone: "0700000001", installerId: "INST123" },
        { name: "Installateur Beta", email: "contact@beta.com", phone: "0700000002", installerId: "INST123" },
      ];
      for (const c of clientData) { await addDoc(collection(db, "clients"), c); clients++; }

      // Dossiers via transaction
      const today = new Date();
      const past = new Date(Date.now() - 8 * 86400000);
      const fileInputs = [
        { installerId: "INST123", pack: "validation", statutGlobal: "en_cours", title: "Validation Maison", clientFinal: "Famille Durand", address: "12 rue du Soleil, 75000 Paris", power: 6, nextAction: "Appel client", nextActionDate: today },
        { installerId: "INST123", pack: "mise_en_service", statutGlobal: "en_attente", title: "Mise en service Site B", clientFinal: "SCI Lumière", address: "45 av. des Énergies, Lyon", power: 9, nextAction: "Relance Consuel", nextActionDate: past },
        { installerId: "INST123", pack: "zero_stress", statutGlobal: "finalise", title: "Zéro Stress Villa C", clientFinal: "Mme Ray", address: "8 impasse Volt, Marseille", power: 12, nextAction: "Facture envoyée", nextActionDate: null },
      ];
      for (const f of fileInputs) { await createFileSafeClient(f); files++; }

      setStatus(`Seed terminé : ${leads} leads, ${clients} clients, ${files} dossiers créés.`);
    } catch (e: any) {
      setStatus(`Erreur seed: ${e.message || e}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="card">
      <h3>Générer des données de démonstration</h3>
      <p className="small">Admin uniquement. Ajoute quelques leads/clients/dossiers de test.</p>
      <button className="btn-primary" disabled={running} onClick={seed}>
        {running ? "En cours..." : "Seed de démo"}
      </button>
      {status && <div style={{ marginTop: 10 }}>{status}</div>}
    </div>
  );
}
