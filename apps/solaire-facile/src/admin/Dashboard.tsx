import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firestore";
import { PACKS } from "../constants";
import { useCollection } from "../hooks/useCollection";
import ThemeToggle from "../components/ThemeToggle";
import LiveBadge from "../components/LiveBadge";

const toDate = (value: any) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  return new Date(value);
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const statusTone = (status = "") => {
  const s = (status || "").toLowerCase();
  if (["finalise", "clos", "gagne"].includes(s)) return "tone-success";
  if (["bloque", "perdu"].includes(s)) return "tone-danger";
  if (["en_attente", "incomplet"].includes(s)) return "tone-warning";
  return "tone-info";
};

const packTone = (pack = "") => {
  const p = (pack || "").toLowerCase();
  if (p.includes("validation")) return "tone-info";
  if (p.includes("mise")) return "tone-warning";
  if (p.includes("stress")) return "tone-success";
  return "tone-neutral";
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: leadsData, loading: leadsLoading } = useCollection("leads");
  const { data: filesData, loading: filesLoading } = useCollection("files");

  const [packFilter, setPackFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const loading = leadsLoading || filesLoading;
  const leads = (leadsData || []) as any[];
  const files = (filesData || []) as any[];

  const stats = useMemo(() => {
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    const recentLeads = leads
      .map((lead: any) => ({ ...lead, __created: toDate(lead.createdAt) || new Date() }))
      .filter((lead: any) => now - lead.__created.getTime() <= THIRTY_DAYS)
      .sort((a: any, b: any) => b.__created.getTime() - a.__created.getTime());

    const gained = recentLeads.filter((lead: any) => (lead.status || "").toLowerCase() === "gagne");
    const lost = recentLeads.filter((lead: any) => (lead.status || "").toLowerCase() === "perdu");

    const statusOf = (f: any) => ((f.statutGlobal || f.status || "") as string).toLowerCase();
    const activeFiles = files.filter((f: any) => statusOf(f) === "en_cours");
    const waitingFiles = files.filter((f: any) => ["en_attente", "incomplet"].includes(statusOf(f)));
    const finalisedFiles = files.filter((f: any) => ["finalise", "clos"].includes(statusOf(f)));
    const blockedFiles = files.filter((f: any) => statusOf(f) === "bloque");

    return {
      leads30: recentLeads.length,
      gained: gained.length,
      lost: lost.length,
      recentLeads,
      filesTotal: files.length,
      filesActive: activeFiles.length,
      filesWaiting: waitingFiles.length,
      filesFinalised: finalisedFiles.length,
      filesBlocked: blockedFiles.length,
    };
  }, [leads, files]);

  const actionsToday = useMemo(() => {
    const today = startOfToday();
    const tomorrow = today + 24 * 60 * 60 * 1000;
    return files.filter((file: any) => {
      const next = toDate(file.nextActionDate);
      if (!next) return false;
      const t = next.getTime();
      return t >= today && t < tomorrow;
    });
  }, [files]);

  const overdue = useMemo(() => {
    const today = startOfToday();
    return files.filter((file: any) => {
      const next = toDate(file.nextActionDate);
      if (!next) return false;
      const status = ((file.statutGlobal || file.status || "") as string).toLowerCase();
      if (["finalise", "clos"].includes(status)) return false;
      return next.getTime() < today;
    });
  }, [files]);

  const filteredFiles = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return files
      .slice()
      .sort((a: any, b: any) => {
        const ad = toDate(a.updatedAt || a.createdAt) || new Date(0);
        const bd = toDate(b.updatedAt || b.createdAt) || new Date(0);
        return bd.getTime() - ad.getTime();
      })
      .filter((file: any) => {
        const pack = ((file.pack || "") as string).toLowerCase();
        const status = ((file.statutGlobal || file.status || "") as string).toLowerCase();
        if (packFilter && pack !== packFilter) return false;
        if (statusFilter && status !== statusFilter) return false;
        if (!needle) return true;
        return [file.reference, file.title, file.clientFinal, file.address]
          .filter(Boolean)
          .some((v: string) => v.toLowerCase().includes(needle));
      });
  }, [files, packFilter, statusFilter, search]);

  if (loading) {
    return (
      <div className="page">
        <div className="topbar">
          <div className="brand">
            <div className="logo">SF</div>
            <div>
              <div className="brand-title">Console Admin</div>
              <div className="brand-sub">Chargement du dashboard…</div>
            </div>
          </div>
          <div className="top-actions">
            <LiveBadge />
            <ThemeToggle />
          </div>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="topbar">
        <div className="brand">
          <div className="logo">SF</div>
          <div>
            <div className="brand-title">Console administrateur</div>
            <div className="brand-sub">Pilotage des dossiers, suivi temps réel, relances et statuts.</div>
          </div>
        </div>

        <div className="top-actions">
          <LiveBadge />
          <span className="pill pill-admin">
            <span className="dot dot-live" aria-hidden="true" />
            ADMIN
          </span>
          <ThemeToggle />
          <button
            type="button"
            className="btn btn-danger"
            onClick={async () => {
              await signOut(auth);
              navigate("/admin/login", { replace: true });
            }}
          >
            Déconnexion
          </button>
        </div>
      </div>

      <div className="layout">
        <aside className="side">
          <div className="side-head">
            <div className="side-title">Navigation</div>
            <div className="side-sub">Accès rapide</div>
          </div>

          <button type="button" className="side-item side-item-active" onClick={() => navigate("/admin")}>
            <span className="side-ico">📊</span>
            Dashboard
          </button>

          <button type="button" className="side-item" onClick={() => navigate("/admin/login")}>
            <span className="side-ico">🔑</span>
            Connexion admin
          </button>

          <div className="side-sep" />

          <div className="side-kpis">
            <button type="button" className="side-kpi" onClick={() => navigate("/admin")}>
              <span className="side-kpi-label">Dossiers</span>
              <span className="side-kpi-value">{stats.filesTotal}</span>
            </button>

            <button type="button" className="side-kpi" onClick={() => navigate("/admin")}>
              <span className="side-kpi-label">En cours</span>
              <span className="side-kpi-value">{stats.filesActive}</span>
            </button>

            <button type="button" className="side-kpi" onClick={() => navigate("/admin")}>
              <span className="side-kpi-label">À faire (jour)</span>
              <span className="side-kpi-value">{actionsToday.length}</span>
            </button>

            <button type="button" className="side-kpi side-kpi-danger" onClick={() => navigate("/admin")}>
              <span className="side-kpi-label">En retard</span>
              <span className="side-kpi-value">{overdue.length}</span>
            </button>
          </div>

          <div className="side-sep" />

          <div className="side-note">
            <div className="side-note-title">Focus</div>
            <div className="side-note-text">
              Priorité : dossiers <strong>en retard</strong> + actions du jour.
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="hero">
            <div className="hero-left">
              <div className="hero-title">Vue d’ensemble</div>
              <div className="hero-sub">
                Leads 30 jours, dossiers, actions, blocages. Tri par mise à jour récente.
              </div>
            </div>
            <div className="hero-right">
              <div className="chip chip-glow">Temps réel</div>
              <div className="chip">Firestore</div>
              <div className="chip">Admin</div>
            </div>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-top">
                <div className="kpi-label">Leads (30j)</div>
                <div className="kpi-ico">📈</div>
              </div>
              <div className="kpi-value">{stats.leads30}</div>
              <div className="kpi-sub">
                <span className="tone tone-success">Gagnés {stats.gained}</span>
                <span className="tone tone-danger">Perdus {stats.lost}</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-top">
                <div className="kpi-label">Dossiers</div>
                <div className="kpi-ico">📂</div>
              </div>
              <div className="kpi-value">{stats.filesTotal}</div>
              <div className="kpi-sub">
                <span className="tone tone-info">En cours {stats.filesActive}</span>
                <span className="tone tone-success">Finalisés {stats.filesFinalised}</span>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-top">
                <div className="kpi-label">Actions du jour</div>
                <div className="kpi-ico">⏰</div>
              </div>
              <div className="kpi-value">{actionsToday.length}</div>
              <div className="kpi-sub">
                <span className="tone tone-neutral">Planifiées</span>
                <span className="tone tone-info">Aujourd’hui</span>
              </div>
            </div>

            <div className="kpi-card kpi-danger">
              <div className="kpi-top">
                <div className="kpi-label">En retard</div>
                <div className="kpi-ico">⚠️</div>
              </div>
              <div className="kpi-value">{overdue.length}</div>
              <div className="kpi-sub">
                <span className="tone tone-danger">Relances</span>
                <span className="tone tone-warning">Bloqués</span>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Dossiers</div>
                  <div className="card-sub">Filtres rapides + recherche.</div>
                </div>

                <div className="filters">
                  <select value={packFilter} onChange={(e) => setPackFilter(e.target.value)} aria-label="Filtre pack">
                    <option value="">Tous packs</option>
                    {PACKS.map((p: any) => (
                      <option key={p.value} value={String(p.value).toLowerCase()}>
                        {p.label}
                      </option>
                    ))}
                  </select>

                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filtre statut">
                    <option value="">Tous statuts</option>
                    <option value="en_cours">En cours</option>
                    <option value="en_attente">En attente</option>
                    <option value="incomplet">Incomplet</option>
                    <option value="bloque">Bloqué</option>
                    <option value="finalise">Finalisé</option>
                    <option value="clos">Clos</option>
                  </select>

                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher (réf, client, adresse)…"
                    aria-label="Recherche"
                  />
                </div>
              </div>

              <div className="table-wrapper">
                <table className="table sticky-head">
                  <thead>
                    <tr>
                      <th>Référence</th>
                      <th>Client</th>
                      <th>Pack</th>
                      <th>Statut</th>
                      <th>Prochaine action</th>
                      <th>Màj</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.slice(0, 120).map((f: any) => {
                      const status = (f.statutGlobal || f.status || "en_cours") as string;
                      const pack = (f.pack || "") as string;
                      const nextDate = toDate(f.nextActionDate);
                      const upd = toDate(f.updatedAt || f.createdAt);
                      return (
                        <tr key={f.id} className="clickable-row" onClick={() => navigate("/admin")} role="button">
                          <td>
                            <div className="cell-strong">{f.reference || "—"}</div>
                            <div className="cell-sub">{f.title || "Dossier"}</div>
                          </td>
                          <td>
                            <div className="cell-strong">{f.clientFinal || "—"}</div>
                            <div className="cell-sub">{f.address || ""}</div>
                          </td>
                          <td>
                            <span className={`tone ${packTone(pack)}`}>{pack || "—"}</span>
                          </td>
                          <td>
                            <span className={`tone ${statusTone(status)}`}>{status}</span>
                          </td>
                          <td>
                            <div className="cell-strong">{f.nextAction || "—"}</div>
                            <div className="cell-sub">{nextDate ? nextDate.toLocaleDateString() : ""}</div>
                          </td>
                          <td>{upd ? upd.toLocaleDateString() : "—"}</td>
                        </tr>
                      );
                    })}
                    {filteredFiles.length === 0 && (
                      <tr>
                        <td colSpan={6} className="empty">
                          Aucun dossier trouvé.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="stack">
              <div className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">Actions du jour</div>
                    <div className="card-sub">À faire aujourd’hui.</div>
                  </div>
                  <span className={`pill ${actionsToday.length ? "pill-live" : "pill-off"}`}>
                    <span className={`dot ${actionsToday.length ? "dot-live" : "dot-off"}`} aria-hidden="true" />
                    {actionsToday.length}
                  </span>
                </div>

                {actionsToday.length === 0 && <div className="empty-block">Aucune action planifiée.</div>}
                {actionsToday.length > 0 && (
                  <ul className="list">
                    {actionsToday.slice(0, 12).map((file: any) => (
                      <li key={file.id} className="list-item">
                        <div className="li-left">
                          <div className="cell-strong">{file.reference || file.title || "—"}</div>
                          <div className="cell-sub">{file.nextAction || "—"}</div>
                        </div>
                        <span className={`tone ${statusTone(file.statutGlobal || file.status || "")}`}>
                          {(file.statutGlobal || file.status || "—") as string}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">En retard</div>
                    <div className="card-sub">À traiter en priorité.</div>
                  </div>
                  <span className={`pill ${overdue.length ? "pill-danger" : "pill-off"}`}>
                    <span className={`dot ${overdue.length ? "dot-danger" : "dot-off"}`} aria-hidden="true" />
                    {overdue.length}
                  </span>
                </div>

                {overdue.length === 0 && <div className="empty-block">Aucun dossier en retard.</div>}
                {overdue.length > 0 && (
                  <ul className="list">
                    {overdue.slice(0, 12).map((file: any) => (
                      <li key={file.id} className="list-item">
                        <div className="li-left">
                          <div className="cell-strong">{file.reference || file.title || "—"}</div>
                          <div className="cell-sub">{file.nextAction || "—"}</div>
                        </div>
                        <span className="tone tone-danger">Urgent</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {stats.recentLeads?.length > 0 && (
                <div className="card">
                  <div className="card-head">
                    <div>
                      <div className="card-title">Leads récents</div>
                      <div className="card-sub">30 jours</div>
                    </div>
                    <span className="pill pill-live">
                      <span className="dot dot-live" aria-hidden="true" />
                      {stats.recentLeads.length}
                    </span>
                  </div>

                  <ul className="list">
                    {stats.recentLeads.slice(0, 10).map((lead: any) => (
                      <li key={lead.id} className="list-item">
                        <div className="li-left">
                          <div className="cell-strong">{lead.name || lead.fullName || lead.profile || "—"}</div>
                          <div className="cell-sub">{lead.email || "—"}</div>
                        </div>
                        <span className={`tone ${statusTone(lead.status || "nouveau")}`}>{lead.status || "nouveau"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
