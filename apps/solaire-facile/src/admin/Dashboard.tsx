import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import DashboardLayout from "../components/layout/DashboardLayout";
import { auth, db } from "../firebase";
import { isAdminFromClaims } from "../lib/authz";

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
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const DEBUG = import.meta.env.VITE_DEBUG_ADMIN === "true";

  useEffect(() => {
    localStorage.setItem("sf_theme_admin", theme);
  }, [theme]);

  useEffect(() => {
    console.log("[ADMIN_DASHBOARD] firebase config", auth.app.options);
    localStorage.setItem("sf_filter_admin", filter);
  }, [filter]);

  useEffect(() => {
    const colPath = "dossiers";
    const colRef = collection(db, colPath);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (DEBUG) {
          console.log("[ADMIN_DASHBOARD] onSnapshot", colPath, "size", snapshot.size);
          console.log(
            "[ADMIN_DASHBOARD] dossiers ids",
            snapshot.docs.map((d) => d.id),
          );
          if (snapshot.size > 0) {
            console.log("[ADMIN_DASHBOARD] first doc data", snapshot.docs[0].data());
          }
        }
        const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setDossiers(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (DEBUG) console.error("[ADMIN_DASHBOARD] onSnapshot", colPath, "error", err?.code, err?.message);
        setError(err?.message ?? "Erreur de chargement");
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (DEBUG) console.log("[ADMIN_DASHBOARD] dossiers state length", dossiers.length, dossiers.map((d) => d.id));
  }, [dossiers]);

  const filteredRows = useMemo(() => {
    if (filter === "ALL") return dossiers;
    return dossiers.filter((d) => normalizeStatus(d) === filter);
  }, [dossiers, filter]);

  useEffect(() => {
    if (DEBUG) {
      console.log("[ADMIN_DASHBOARD] filteredRows length", filteredRows.length, filteredRows.map((d) => d.id));
      console.log("[ADMIN_DASHBOARD] filter", filter);
    }
  }, [filteredRows, filter]);

  const counts = useMemo(() => {
    const base = dossiers;
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

  const visibleRows = useMemo(() => {
    return isAdmin ? dossiers : filteredRows;
  }, [dossiers, filteredRows, isAdmin]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      try {
        const token = await user.getIdTokenResult(true);
        const wl = (import.meta.env.VITE_ADMIN_UIDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        const adminFlag = isAdminFromClaims(token, user.uid ?? "", wl);
        setIsAdmin(adminFlag);
        if (DEBUG) {
          console.log("[ADMIN_DASHBOARD] claims", token.claims, "isAdmin", adminFlag);
        }
      } catch (err) {
        if (DEBUG) console.error("[ADMIN_DASHBOARD] token error", err);
        setIsAdmin(false);
      }
    });
    return () => unsub();
  }, [DEBUG]);

  useEffect(() => {
    if (DEBUG) console.log("[ADMIN_DASHBOARD] visibleRows length", visibleRows.length, visibleRows.map((d) => d.id));
  }, [visibleRows]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogout = async () => {
    setLogoutError(null);
    try {
      await signOut(auth);
      console.warn("[DASHBOARD] redirect_to_login disabled (AdminRoute handles auth)");
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
            <div className="row" style={{ justifyContent: "space-between" }}>
              <p className="section-sub">Dernière mise à jour en temps réel</p>
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
              {!loading && !error && visibleRows.length === 0 && (
                <div className="stateBox">
                  <p className="stateTitle">Aucun dossier</p>
                  <p className="stateText">Les dossiers apparaîtront ici dès qu’ils seront disponibles.</p>
                </div>
              )}
              {visibleRows.map((row) => (
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
