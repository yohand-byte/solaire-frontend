import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import DashboardLayout from "../components/layout/DashboardLayout";
import { auth, db } from "../firebase";

const sampleRow = {
  title: "Dossier test",
  status: "EN COURS",
  installerId: "8G2xjQ4WHCvawxGlselN2OCK7KT72",
  lastUpdate: "18 déc., 15:04",
};

type NormStatus = "EN_ATTENTE" | "EN_COURS" | "VALIDE" | "REFUSE" | "TERMINE" | "UNKNOWN";

function stripAccents(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function canon(input: any): string {
  const s = stripAccents(String(input ?? "")).trim().toLowerCase();
  return s.replace(/[^a-z0-9]+/g, "").replace(/^_+|_+$/g, "");
}

function normalizeStatus(d: any): NormStatus {
  const raw =
    d?.status ??
    d?.statut ??
    d?.state ??
    d?.step ??
    d?.phase ??
    d?.status_label ??
    d?.statusLabel ??
    d?.statusText ??
    d?.label ??
    "";

  const v = canon(raw);

  const map: Record<Exclude<NormStatus, "UNKNOWN">, string[]> = {
    EN_ATTENTE: ["en_attente", "attente", "pending", "to_do", "todo", "new", "nouveau"],
    EN_COURS: ["en_cours", "cours", "in_progress", "progress", "working", "processing", "open"],
    VALIDE: ["valide", "approved", "accept", "accepted", "ok", "validated", "validation_ok"],
    REFUSE: ["refuse", "refus", "rejected", "deny", "denied", "ko", "canceled", "cancelled"],
    TERMINE: ["termine", "fini", "complete", "completed", "closed", "archive", "archived", "done", "final"],
  };

  for (const key of Object.keys(map) as Exclude<NormStatus, "UNKNOWN">[]) {
    if (map[key].some((t) => v === t || v.includes(t))) return key;
  }
  return "UNKNOWN";
}

export default function AdminDashboard() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("sf_theme_admin");
    return stored === "dark" ? "dark" : "light";
  });
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const filterOptions = ["ALL", "EN_ATTENTE", "EN_COURS", "VALIDE", "REFUSE", "TERMINE"] as const;
  const [filter, setFilter] = useState<(typeof filterOptions)[number]>(() => {
    if (typeof window === "undefined") return "ALL";
    const stored = localStorage.getItem("sf_filter_admin");
    return filterOptions.includes((stored as any) ?? "") ? ((stored as any) as (typeof filterOptions)[number]) : "ALL";
  });
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [errorById, setErrorById] = useState<Record<string, string | null>>({});
  const userEmail = auth.currentUser?.email ?? "—";

  useEffect(() => {
    localStorage.setItem("sf_theme_admin", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("sf_filter_admin", filter);
  }, [filter]);

  useEffect(() => {
    const colRef = collection(db, "dossiers");
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setDossiers(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err?.message ?? "Erreur de chargement");
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  const filteredRows = useMemo(() => {
    const base = dossiers.length ? dossiers : [sampleRow];
    if (filter === "ALL") return base;
    return base.filter((d) => normalizeStatus(d) === filter);
  }, [dossiers, filter]);

  const counts = useMemo(() => {
    const base = dossiers.length ? dossiers : [sampleRow];
    const tally = { ALL: base.length, EN_ATTENTE: 0, EN_COURS: 0, VALIDE: 0, REFUSE: 0, TERMINE: 0 } as Record<
      (typeof filterOptions)[number],
      number
    >;
    tally.ALL = base.length;
    for (const d of base) {
      const ns = normalizeStatus(d);
      if (ns in tally) {
        tally[ns as keyof typeof tally] += 1;
      }
    }
    return tally;
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogout = async () => {
    setLogoutError(null);
    try {
      await signOut(auth);
      window.location.assign("/admin/login");
    } catch (err: any) {
      setLogoutError(err?.message ?? "Déconnexion impossible.");
    }
  };

  const handleStatusChange = async (dossier: any, nextStatus: NormStatus) => {
    const id = dossier?.id ?? dossier?.installerId ?? dossier?.clientId;
    if (!id) return;
    setSavingById((prev) => ({ ...prev, [id]: true }));
    setErrorById((prev) => ({ ...prev, [id]: null }));
    const targetField = dossier?.status !== undefined ? "status" : dossier?.statut !== undefined ? "statut" : "status";
    try {
      await updateDoc(doc(db, "dossiers", id), { [targetField]: nextStatus });
    } catch (err: any) {
      setErrorById((prev) => ({ ...prev, [id]: err?.message ?? "Sauvegarde impossible" }));
    } finally {
      setSavingById((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <DashboardLayout
      title="Console administrateur"
      subtitle="Pilotage des dossiers en temps réel et supervision des installateurs."
      theme={theme}
      actions={
        <>
          <button className="btn btn-ghost btn-small" onClick={handleToggleTheme}>
            Mode {theme === "dark" ? "clair" : "sombre"}
          </button>
          <span className="pill">
            <span className="avatar">AD</span>
            <span className="stack tight">
              <strong style={{ fontSize: 13 }}>{userEmail}</strong>
              <span className="section-sub">Connecté</span>
            </span>
          </span>
          <button className="btn btn-primary btn-small" onClick={handleLogout}>
            Se déconnecter
          </button>
          {logoutError && <span className="section-sub" style={{ color: "#b91c1c" }}>{logoutError}</span>}
        </>
      }
    >
      <div className="stack">
        <div className="card-grid">
          <div className="card stack">
            <div className="row">
              <div>
                <p className="section-sub">Dossiers actifs</p>
                <div className="kpi-value">1</div>
                <p className="kpi-label">Volume total suivi en ce moment</p>
              </div>
              <span className="badge success">Prêt</span>
            </div>
          </div>
          <div className="card stack">
            <p className="section-sub">En cours</p>
            <div className="kpi-value">1</div>
            <p className="kpi-label">Dossiers en production</p>
            <span className="badge info">Production</span>
          </div>
          <div className="card stack">
            <p className="section-sub">En attente</p>
            <div className="kpi-value">0</div>
            <p className="kpi-label">Dossiers en analyse</p>
            <span className="badge warning">Analyse</span>
          </div>
        </div>

        <div className="card stack">
          <div className="row">
            <div>
              <h3 className="section-heading">Suivi des dossiers</h3>
              <p className="section-sub">Toutes les fiches installateurs et leurs statuts</p>
            </div>
            <span className="badge success">Accès global</span>
          </div>

          <div className="panel stack" style={{ padding: 16 }}>
            <div className="row" style={{ alignItems: "flex-start" }}>
              <div className="stack">
                <h4 style={{ margin: 0 }}>{sampleRow.title}</h4>
                <p className="section-sub">ID : mnhYCmWr7545evrEU7iv</p>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <span className="badge info">{sampleRow.status}</span>
                <span className="badge">{sampleRow.installerId}</span>
              </div>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <p className="section-sub">Dernière mise à jour {sampleRow.lastUpdate}</p>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                {filterOptions.map((label) => (
                  <button
                    key={label}
                    className={`btn btn-ghost btn-small ${filter === label ? "filter-active" : ""}`}
                    onClick={() => setFilter(label)}
                  >
                    <span>
                      {label === "ALL"
                        ? "Tous"
                        : label === "EN_ATTENTE"
                        ? "En attente"
                        : label === "EN_COURS"
                        ? "En cours"
                        : label === "VALIDE"
                        ? "Validé"
                        : label === "REFUSE"
                        ? "Refusé"
                        : "Terminé"}
                    </span>
                    <span className="filterBadge">{counts[label]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="stack">
              {loading && (
                <div className="stateBox">
                  <p className="stateTitle">Chargement des dossiers…</p>
                  <p className="stateText">Connexion en temps réel en cours.</p>
                </div>
              )}
              {error && (
                <div className="stateBox errorPill">
                  <p className="stateTitle">Erreur</p>
                  <p className="stateText">{error}</p>
                </div>
              )}
              {!loading && !error && filteredRows.length === 0 && (
                <div className="stateBox">
                  <p className="stateTitle">Aucun dossier</p>
                  <p className="stateText">Les dossiers apparaîtront ici dès qu’ils seront disponibles.</p>
                </div>
              )}
              {filteredRows.map((row) => (
                <div key={row.id ?? row.installerId ?? row.title} className="row" style={{ alignItems: "flex-start" }}>
                  <div className="stack">
                    <h4 style={{ margin: 0 }}>{row.title ?? "Dossier"}</h4>
                    <p className="section-sub">ID : {row.installerId ?? row.clientId ?? row.userId ?? "N/A"}</p>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="badge info">{row.status ?? row.statut ?? "Statut inconnu"}</span>
                    <span className="badge">{row.installerId ?? row.id ?? ""}</span>
                  </div>
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    {(["EN_ATTENTE", "EN_COURS", "VALIDE", "REFUSE", "TERMINE"] as NormStatus[]).map((opt) => (
                      <button
                        key={opt}
                        className={`statusBtn ${normalizeStatus(row) === opt ? "statusBtnActive" : ""}`}
                        disabled={!!savingById[row.id ?? row.installerId ?? row.title]}
                        onClick={() => handleStatusChange(row, opt)}
                      >
                        {opt === "EN_ATTENTE"
                          ? "En attente"
                          : opt === "EN_COURS"
                          ? "En cours"
                          : opt === "VALIDE"
                          ? "Validé"
                          : opt === "REFUSE"
                          ? "Refusé"
                          : "Terminé"}
                        {savingById[row.id ?? row.installerId ?? row.title] && <span className="savingDot" />}
                      </button>
                    ))}
                  </div>
                  {errorById[row.id ?? row.installerId ?? row.title] && (
                    <div className="rowError">
                      {errorById[row.id ?? row.installerId ?? row.title]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
