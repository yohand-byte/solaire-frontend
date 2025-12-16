import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firestore";
import { PACKS } from "../constants";
import { useCollection } from "../hooks/useCollection";

const toDate = (value: any) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  return new Date(value);
};

const todayKey = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
};

const statusClass = (status = "") => {
  const normalized = status.toLowerCase();
  if (normalized === "en_cours") return "badge-status info";
  if (normalized === "en_attente" || normalized === "incomplet") return "badge-status warning";
  if (normalized === "finalise" || normalized === "clos") return "badge-status success";
  if (normalized === "bloque") return "badge-status warning";
  return "badge-status";
};

const packClass = (pack = "") => `badge-pack badge-pack-${pack.replace(/[^a-z0-9]/gi, "_")}`;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: leadsData, loading: leadsLoading } = useCollection("leads");
  const { data: filesData, loading: filesLoading } = useCollection("files");
  const [packFilter, setPackFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const loading = leadsLoading || filesLoading;

  const leads = leadsData || [];
  const files = filesData || [];

  const stats = useMemo(() => {
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const recentLeads = leads
      .map((lead: any) => ({
        ...lead,
        __created: toDate(lead.createdAt) || new Date(),
      }))
      .filter((lead: any) => now - lead.__created.getTime() <= THIRTY_DAYS)
      .sort((a: any, b: any) => b.__created.getTime() - a.__created.getTime());
    const gained = recentLeads.filter((lead: any) => (lead.status || "").toLowerCase() === "gagne");
    const lost = recentLeads.filter((lead: any) => (lead.status || "").toLowerCase() === "perdu");
    const activeFiles = files.filter((file: any) => (file.statutGlobal || file.status || "").toLowerCase() === "en_cours");
    const finalisedFiles = files.filter((file: any) => ["finalise", "clos"].includes((file.statutGlobal || file.status || "").toLowerCase()));
    const blockedFiles = files.filter((file: any) => (file.statutGlobal || file.status || "").toLowerCase() === "bloque");
    return {
      leads30: recentLeads.length,
      gained: gained.length,
      lost: lost.length,
      recentLeads,
      filesTotal: files.length,
      filesActive: activeFiles.length,
      filesFinalised: finalisedFiles.length,
      filesBlocked: blockedFiles.length,
    };
  }, [leads, files]);

  const actionsToday = useMemo(() => {
    const today = todayKey();
    const tomorrow = today + 24 * 60 * 60 * 1000;
    return files.filter((file: any) => {
      const next = toDate(file.nextActionDate);
      if (!next) return false;
      const time = next.getTime();
      return time >= today && time < tomorrow;
    });
  }, [files]);

  const overdue = useMemo(() => {
    const today = todayKey();
    return files.filter((file: any) => {
      const next = toDate(file.nextActionDate);
      if (!next) return false;
      const status = (file.statutGlobal || file.status || "").toLowerCase();
      if (["finalise", "clos"].includes(status)) return false;
      return next.getTime() < today;
    });
  }, [files]);

  const filteredFiles = useMemo(() => {
    return files.filter((file: any) => {
      const pack = (file.pack || file.status || "").toLowerCase();
      if (packFilter && pack !== packFilter) return false;
      const status = (file.statutGlobal || file.status || "").toLowerCase();
      if (statusFilter && status !== statusFilter) return false;
      if (search) {
        const needle = search.toLowerCase();
        return [file.reference, file.title, file.clientFinal, file.address]
          .filter(Boolean)
          .some((value: string) => value.toLowerCase().includes(needle));
      }
      return true;
    });
  }, [files, packFilter, statusFilter, search]);

  if (loading) {
    return <div className="card">Chargement du dashboard…</div>;
  }

  return (
    <div className="dashboard">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button className="btn-secondary" onClick={async () => { await signOut(auth); navigate("/", { replace: true }); }}>
          Déconnexion
        </button>
      </div>
      <div className="cards">
        <div className="metric">
          <div className="metric-header">
            <span>Leads (30 j)</span>
            <span style={{ fontSize: 18 }}>📈</span>
          </div>
          <div className="big">{stats.leads30}</div>
          <div className="small">Gagnés : {stats.gained} · Perdus : {stats.lost}</div>
        </div>
        <div className="metric">
          <div className="metric-header">
            <span>Dossiers</span>
            <span style={{ fontSize: 18 }}>📂</span>
          </div>
          <div className="big">{stats.filesTotal}</div>
          <div className="small">En cours : {stats.filesActive} · Finalisés : {stats.filesFinalised}</div>
        </div>
        <div className="metric">
          <div className="metric-header">
            <span>Actions du jour</span>
            <span style={{ fontSize: 18 }}>⏰</span>
          </div>
          <div className="big">{actionsToday.length}</div>
          <div className="small">planifiées aujourd’hui</div>
        </div>
        <div className="metric">
          <div className="metric-header">
            <span>En retard</span>
            <span style={{ fontSize: 18 }}>⚠️</span>
          </div>
          <div className="big">{overdue.length}</div>
          <div className="small">Bloqués + relances</div>
        </div>
      </div>

      {stats.recentLeads?.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4>Leads récents (30 j)</h4>
            <div className="small">Total : {stats.recentLeads.length}</div>
          </div>
          <div className="table-wrapper" style={{ maxHeight: 260 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nom / Profil</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLeads.slice(0, 20).map((lead: any) => (
                  <tr
                    key={lead.id}
                    className="clickable-row"
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{lead.name || lead.fullName || lead.profile || "—"}</td>
                    <td>{lead.email || "—"}</td>
                    <td>{lead.phone || "—"}</td>
                    <td><span className={`badge-status ${lead.status || "nouveau"}`}>{lead.status || "nouveau"}</span></td>
                    <td>{(lead.__created || toDate(lead.createdAt) || new Date()).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid" style={{ marginTop: 24, gap: 16 }}>
        <div className="card" style={{ flex: 1 }}>
          <h4>Actions du jour</h4>
          {actionsToday.length === 0 && <div className="small">Aucune action planifiée.</div>}
          {actionsToday.length > 0 && (
            <ul className="timeline">
              {actionsToday.map((file: any) => (
                <li key={file.id}>
                  <strong>{file.reference || file.title}</strong>
                  <span>{file.nextAction || "—"}</span>
                  <small>{toDate(file.nextActionDate)?.toLocaleDateString()}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card" style={{ flex: 1 }}>
          <h4>Dossiers en retard</h4>
          {overdue.length === 0 && <div className="small">Aucun dossier en retard.</div>}
          {overdue.length > 0 && (
            <ul className="timeline">
              {overdue.map((file: any) => (
                <li key={file.id}>
                  <strong>{file.reference || file.title}</strong>
                  <span>{file.nextAction || "—"}</span>
                  <small>Prévu : {toDate(file.nextActionDate)?.toLocaleDateString()}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="filters" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <select value={packFilter} onChange={(e) => setPackFilter(e.target.value)}>
            <option value="">Pack (tous)</option>
            {PACKS.map((pack) => (
              <option key={pack.value} value={pack.value}>{pack.label}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Statut (tous)</option>
            <option value="en_cours">En cours</option>
            <option value="en_attente">En attente</option>
            <option value="bloque">Bloqué</option>
            <option value="finalise">Finalisé</option>
            <option value="clos">Clos</option>
          </select>
          <input
            placeholder="Recherche référence / client"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Client</th>
                <th>Pack</th>
                <th>Statut</th>
                <th>Prochaine action</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file: any) => (
                <tr key={file.id} className="clickable-row" onClick={() => navigate(`/dossiers/${file.id}`)}>
                  <td>{file.reference || file.title}</td>
                  <td>{file.clientFinal || file.address || "—"}</td>
                  <td><span className={packClass(file.pack || file.status)}>{PACKS.find((p) => p.value === (file.pack || file.status))?.label || (file.pack || file.status)}</span></td>
                  <td><span className={statusClass(file.statutGlobal || file.status)}>{file.statutGlobal || file.status}</span></td>
                  <td>{file.nextAction || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
