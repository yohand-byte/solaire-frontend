import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db, app } from "../lib/firestore";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
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
  const [view, setView] = useState<"dashboard" | "leads" | "files">("dashboard");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [todoToday, setTodoToday] = useState(false);
  const [late, setLate] = useState(false);

  const [params, setParams] = useSearchParams();
  const [quickFilter, setQuickFilter] = useState<"all" | "active" | "today" | "overdue">("all");
  const [clientEmail, setClientEmail] = useState("");
  const [clientEmailSaving, setClientEmailSaving] = useState(false);
  const [clientEmailInfo, setClientEmailInfo] = useState<string | null>(null);
  const [clientEmailError, setClientEmailError] = useState<string | null>(null);
  const [sendInfo, setSendInfo] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [statusDraft, setStatusDraft] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusInfo, setStatusInfo] = useState<string | null>(null);

  const openFile = (id: string) => setParams({ file: id });
  const closeFile = () => {
    params.delete("file");
    setParams(params, { replace: true } as any);
  };
  const selectedId = params.get("file");

  const loading = leadsLoading || filesLoading;
  const leads = (leadsData || []) as any[];
  const files = (filesData || []) as any[];
  const leadsSorted = useMemo(() => {
    return leads
      .slice()
      .sort((a: any, b: any) => {
        const ad = toDate(a.updatedAt || a.createdAt) || new Date(0);
        const bd = toDate(b.updatedAt || b.createdAt) || new Date(0);
        return bd.getTime() - ad.getTime();
      });
  }, [leads]);

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
    const packNeedle = packFilter.trim().toLowerCase();
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
        const next = toDate(file.nextActionDate);
        const today0 = startOfToday();
        const tomorrow0 = today0 + 24 * 60 * 60 * 1000;

        if (packNeedle && pack !== packNeedle) return false;
        if (statusFilter && status !== statusFilter) return false;

        const activeQuick = todoToday ? "today" : late ? "overdue" : quickFilter;

        if (activeQuick === "active") {
          if (status !== "en_cours") return false;
        }
        if (activeQuick === "today") {
          if (!next) return false;
          const t = next.getTime();
          if (t < today0 || t >= tomorrow0) return false;
        }
        if (activeQuick === "overdue") {
          if (!next) return false;
          if (["finalise", "clos"].includes(status)) return false;
          if (next.getTime() >= today0) return false;
        }

        if (!needle) return true;
        return [file.reference, file.title, file.clientFinal, file.address]
          .filter(Boolean)
          .some((v: string) => v.toLowerCase().includes(needle));
      });
  }, [files, packFilter, statusFilter, search, quickFilter]);


  const selectedFile = useMemo(() => {
    if (!selectedId) return null;
    return files.find((x: any) => String(x.id) === String(selectedId)) || null;
  }, [files, selectedId]);

  useEffect(() => {
    setClientEmail(selectedFile?.clientEmail ? String(selectedFile.clientEmail) : "");
    setClientEmailInfo(null);
    setClientEmailError(null);
    setSendInfo(null);
    setSendError(null);
    setStatusDraft(String(selectedFile?.statutGlobal || selectedFile?.status || ""));
    setStatusError(null);
    setStatusInfo(null);
  }, [selectedFile?.id]);

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
              try { localStorage.clear(); } catch {}
              try { await signOut(auth); } catch {}
              window.location.assign("/admin/login");
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

          <button
            type="button"
            className={`side-item ${view === "dashboard" ? "side-item-active" : ""}`}
            onClick={() => {
              setView("dashboard");
              setSelectedLead(null);
              setTodoToday(false);
              setLate(false);
              closeFile();
              navigate("/admin");
            }}
          >
            <span className="side-ico">📊</span>
            Dashboard
          </button>

          <button
            type="button"
            className={`side-item ${view === "leads" ? "side-item-active" : ""}`}
            onClick={() => {
              setView("leads");
              setSelectedLead(null);
              setTodoToday(false);
              setLate(false);
              closeFile();
              navigate("/admin");
            }}
          >
            <span className="side-ico">📋</span>
            Leads
          </button>

          <button type="button" className="side-item" onClick={() => navigate("/admin/login")}>
            <span className="side-ico">🔑</span>
            Connexion admin
          </button>

          <div className="side-sep" />

          <div className="side-kpis">
            <button
              type="button"
              className="side-kpi"
              onClick={() => {
                setView("leads");
                setSelectedLead(null);
                setTodoToday(false);
                setLate(false);
                closeFile();
                navigate("/admin");
              }}
            >
              <span className="side-kpi-label">Leads</span>
              <span className="side-kpi-value">{leads.length}</span>
            </button>

            <button
              type="button"
              className="side-kpi"
              onClick={() => {
                setView("files");
                setQuickFilter("all");
                setTodoToday(false);
                setLate(false);
                setPackFilter("");
                setStatusFilter("");
                setSearch("");
                closeFile();
              }}
            >
              <span className="side-kpi-label">Dossiers</span>
              <span className="side-kpi-value">{stats.filesTotal}</span>
            </button>

            <button
              type="button"
              className="side-kpi"
              onClick={() => {
                setView("files");
                setQuickFilter("all");
                setTodoToday(false);
                setLate(false);
                setPackFilter("");
                setStatusFilter("en_cours");
                setSearch("");
                closeFile();
              }}
            >
              <span className="side-kpi-label">En cours</span>
              <span className="side-kpi-value">{stats.filesActive}</span>
            </button>

            <button
              type="button"
              className="side-kpi"
              onClick={() => {
                setView("files");
                setQuickFilter("all");
                setTodoToday(true);
                setLate(false);
                setPackFilter("");
                setStatusFilter("");
                setSearch("");
                closeFile();
              }}
            >
              <span className="side-kpi-label">À faire (jour)</span>
              <span className="side-kpi-value">{actionsToday.length}</span>
            </button>

            <button
              type="button"
              className="side-kpi side-kpi-danger"
              onClick={() => {
                setView("files");
                setQuickFilter("all");
                setTodoToday(false);
                setLate(true);
                setPackFilter("");
                setStatusFilter("");
                setSearch("");
                closeFile();
              }}
            >
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
          {view === "leads" ? (
            <>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-head">
                  <div>
                    <div className="card-title">Leads</div>
                    <div className="card-sub">{leadsSorted.length} lead(s)</div>
                  </div>
                </div>
                <div className="table-wrapper">
                  <table className="table sticky-head">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Entreprise</th>
                        <th>Email</th>
                        <th>Téléphone</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leadsSorted.slice(0, 200).map((lead: any) => (
                        <tr
                          key={lead.id}
                          className="clickable-row"
                          onClick={() => setSelectedLead(lead)}
                          role="button"
                        >
                          <td>{lead.name || lead.fullName || lead.profile || "—"}</td>
                          <td>{lead.company || lead.companyName || lead.entreprise || lead.societe || "—"}</td>
                          <td>{lead.email || "—"}</td>
                          <td>{lead.phone || lead.téléphone || "—"}</td>
                          <td>
                            <span className={`tone ${statusTone(lead.status || "nouveau")}`}>
                              {lead.status || "nouveau"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {leadsSorted.length === 0 && (
                        <tr>
                          <td colSpan={5} className="empty">
                            Aucun lead.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedLead ? (
                <div className="card">
                  <div className="card-head">
                    <div>
                      <div className="card-title">Fiche lead</div>
                      <div className="card-sub">{selectedLead.id}</div>
                    </div>
                  </div>
                  <div className="grid-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div className="panel-card">
                      <div className="panel-title">Nom</div>
                      <div className="panel-sub">{selectedLead.name || selectedLead.fullName || selectedLead.profile || "—"}</div>
                      <div style={{ height: 10 }} />
                      <div className="panel-title">Entreprise</div>
                      <div className="panel-sub">{selectedLead.company || selectedLead.companyName || selectedLead.entreprise || selectedLead.societe || "—"}</div>
                    </div>
                    <div className="panel-card">
                      <div className="panel-title">Contact</div>
                      <div className="panel-sub">{selectedLead.email || "—"}</div>
                      <div className="panel-sub">{selectedLead.phone || selectedLead.téléphone || "—"}</div>
                      <div style={{ height: 10 }} />
                      <div className="panel-title">Statut</div>
                      <div className="panel-sub">{selectedLead.status || "nouveau"}</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {selectedFile ? (
                <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-head">
                <div>
                  <div className="card-title">Fiche dossier</div>
                  <div className="card-sub">{selectedFile.reference || selectedFile.id}</div>
                </div>
                <div className="panel-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeFile}>Retour</button>
                </div>
              </div>
              <div className="grid-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="panel-card">
                  <div className="panel-title">Client</div>
                  <div className="panel-sub">{selectedFile.clientFinal || "—"}</div>
                  <div style={{ height: 10 }} />
                  <div className="panel-title">Adresse</div>
                  <div className="panel-sub">{selectedFile.address || "—"}</div>
                </div>
                <div className="panel-card">
                  <div className="panel-title">Statut</div>
                  <div className="panel-sub">{selectedFile.statutGlobal || selectedFile.status || "—"}</div>
                  <div style={{ height: 10 }} />
                  <div className="panel-title">Pack</div>
                  <div className="panel-sub">{selectedFile.pack || "—"}</div>
                  <div style={{ height: 12 }} />
                  <div className="panel-title">Mettre à jour le statut</div>
                  <div className="filters" style={{ marginTop: 6 }}>
                    <select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)} aria-label="Statut dossier">
                      <option value="">—</option>
                      <option value="en_cours">En cours</option>
                      <option value="en_attente">En attente</option>
                      <option value="incomplet">Incomplet</option>
                      <option value="bloque">Bloqué</option>
                      <option value="finalise">Finalisé</option>
                      <option value="clos">Clos</option>
                    </select>
                  </div>
                  {statusInfo ? (
                    <div className="empty-block" style={{ borderStyle: "solid", marginTop: 8 }}>
                      {statusInfo}
                    </div>
                  ) : null}
                  {statusError ? (
                    <div className="empty-block" style={{ borderStyle: "solid", marginTop: 8 }}>
                      {statusError}
                    </div>
                  ) : null}
                  <div className="panel-foot" style={{ marginTop: 6 }}>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={statusSaving || !statusDraft || !selectedFile}
                      onClick={async () => {
                        if (!selectedFile) return;
                        setStatusInfo(null);
                        setStatusError(null);
                        setStatusSaving(true);
                        const fileId = String(selectedFile?.id || selectedId || "").trim();
                        if (!fileId) {
                          setStatusError("Identifiant dossier manquant.");
                          setStatusSaving(false);
                          return;
                        }
                        try {
                          await updateDoc(doc(db, "files", fileId), {
                            statutGlobal: statusDraft,
                            status: statusDraft,
                            updatedAt: serverTimestamp(),
                          });
                          setStatusInfo("Statut mis à jour.");
                        } catch (e: any) {
                          setStatusError(e?.message ?? "Impossible de mettre à jour le statut.");
                        } finally {
                          setStatusSaving(false);
                        }
                      }}
                    >
                      {statusSaving ? "Mise à jour…" : "Enregistrer le statut"}
                    </button>
                  </div>
                </div>
              </div>
              <div className="panel-card" style={{ marginTop: 12 }}>
                <div className="panel-title">Email client</div>
                <div className="panel-sub">Lien automatique pour l’espace client.</div>
                <div className="filters" style={{ marginTop: 8 }}>
                  <input
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="email@client.fr"
                    autoComplete="email"
                  />
                </div>
                {clientEmailInfo ? (
                  <div className="empty-block" style={{ borderStyle: "solid", marginTop: 8 }}>
                    {clientEmailInfo}
                  </div>
                ) : null}
                {clientEmailError ? (
                  <div className="empty-block" style={{ borderStyle: "solid", marginTop: 8 }}>
                    {clientEmailError}
                  </div>
                ) : null}
                {sendInfo ? (
                  <div className="empty-block" style={{ borderStyle: "solid", marginTop: 8 }}>
                    {sendInfo}
                  </div>
                ) : null}
                {sendError ? (
                  <div className="empty-block" style={{ borderStyle: "solid", marginTop: 8 }}>
                    {sendError}
                  </div>
                ) : null}
                <div className="panel-foot" style={{ marginTop: 6 }}>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={clientEmailSaving || !selectedFile}
                    onClick={async () => {
                      if (!selectedFile) return;
                      setClientEmailInfo(null);
                      setClientEmailError(null);
                      const normalized = clientEmail.trim().toLowerCase();
                      setClientEmailSaving(true);
                      try {
                        await updateDoc(doc(db, "files", String(selectedFile.id)), { clientEmail: normalized });
                        setClientEmail(normalized);
                        setClientEmailInfo("Email client enregistré.");
                      } catch (e: any) {
                        setClientEmailError(e?.message ?? "Impossible d’enregistrer l’email client.");
                      } finally {
                        setClientEmailSaving(false);
                      }
                    }}
                  >
                    {clientEmailSaving ? "Enregistrement…" : "Enregistrer"}
                  </button>
                  <button
                    className="btn btn-pill"
                    type="button"
                    disabled={sendLoading || !clientEmail.trim()}
                    onClick={async () => {
                      const normalized = clientEmail.trim().toLowerCase();
                      if (!normalized) {
                        setSendError("Email client requis.");
                        return;
                      }
                      setSendInfo(null);
                      setSendError(null);
                      setSendLoading(true);
                      try {
                        const callable = httpsCallable(getFunctions(app, "europe-west1"), "sendClientMagicLink");
                        await callable({
                          clientEmail: normalized,
                          fileId: selectedFile?.id || null,
                          reference: selectedFile?.reference || null,
                        });
                        setSendInfo("Lien envoyé au client.");
                      } catch (e: any) {
                        setSendError(e?.message ?? "Impossible d’envoyer le lien.");
                      } finally {
                        setSendLoading(false);
                      }
                    }}
                  >
                    {sendLoading ? "Envoi…" : "Envoyer lien client"}
                  </button>
                </div>
              </div>
                </div>
              ) : null}
              <div className="hero">
            <div className="hero-left">
              <div className="hero-title">Vue d’ensemble</div>
              <div className="hero-sub">
                Leads 30 jours, dossiers, actions, blocages. Tri par mise à jour récente.
              </div>
            </div>
            <div className="hero-right">
              <div className="chip chip-glow">Temps réel</div>
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
                  <select value={packFilter} onChange={(e) => setPackFilter(e.target.value.toLowerCase())} aria-label="Filtre pack">
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
                        <tr key={f.id} className="clickable-row" onClick={() => openFile(String(f.id))} role="button">
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
            </>
          )}
        </main>
      </div>
    </div>
  );
}
