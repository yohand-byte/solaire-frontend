import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, Link, useNavigate, useParams } from "react-router-dom";
import { PACKS } from './constants.ts';
import ClientLogin from "./client/Login.tsx";
import ClientDashboard from "./client/Dashboard.tsx";
import ClientFiles from "./client/Files.tsx";
import ClientFileDetail from "./client/FileDetail.tsx";
import { ClientRoute } from "./client/ClientRoute.tsx";
import AdminDashboard from "./admin/AdminDashboard.tsx";
import AdminFileDetail from "./admin/AdminFileDetail.tsx";
import AdminPlanning from "./admin/AdminPlanning.tsx";
import OperatorBoard from "./admin/OperatorBoard.tsx";
import LeadDetail from "./admin/LeadDetail.tsx";
import { createFileSafeClient } from "./lib/firestore.ts";
import { useCollection } from "./hooks/useCollection.tsx";
import DevSeed from "./admin/DevSeed.tsx";
import FixInstallerIds from "./admin/FixInstallerIds.tsx";
import { useAuth } from "./hooks/useAuth.tsx";
import LoginAdmin from "./admin/LoginAdmin.tsx";
import { API_URL } from "./api/client";
import { AuthDebug } from "./debug/AuthDebug";

const API_BASE = API_URL;
const API_TOKEN = 'saftoken-123';

const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5 12 3l9 6.5" />
    <path d="M5 10v10h14V10" />
    <path d="M9 21V9h6v12" />
  </svg>
);

const LeadsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4h18" />
    <path d="M4 7h16l-1.5 11h-13z" />
    <path d="M9 11h6" />
  </svg>
);

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
  </svg>
);

const FolderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7h5l2 2h11v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
  </svg>
);

function useFetch(url, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!url) return;
    let mounted = true;
    setLoading(true);
    fetch(url)
      .then(async (r) => {
        const text = await r.text();
        if (!r.ok) throw new Error(text || `HTTP ${r.status}`);
        try {
          return JSON.parse(text || "null");
        } catch (e) {
          throw new Error(`Bad JSON: ${text.slice(0, 120)}`);
        }
      })
      .then((d) => mounted && setData(d))
      .catch((e) => mounted && setError(e))
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, [url, ...deps]);
  return { data, loading, error };
}

function Kanban({ leads }) {
  const columns = [
    { key: 'nouveau', label: 'Nouveau' },
    { key: 'en_cours', label: 'En cours' },
    { key: 'gagne', label: 'Gagné' },
    { key: 'perdu', label: 'Perdu' },
  ];
  return (
    <div className="kanban card">
      {columns.map((col) => (
        <div className="column" key={col.key}>
          <h4>{col.label}</h4>
          {leads
            .filter((l) => (l.status || '').toLowerCase() === col.key)
            .map((l) => (
              <div className="card-lead" key={l.id}>
                <div><strong>{l.name || 'Sans nom'}</strong></div>
                <div className="small">{l.email || l.phone || '—'}</div>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

function LeadsTable({ leads, onSelect }) {
  const navigate = useNavigate();
  return (
    <div className="card">
      <table className="table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Email</th>
            <th>Téléphone</th>
            <th>Statut</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr
              key={l.id}
              className="clickable-row"
              onClick={() => navigate(`/leads/${l.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <td>{l.name || '—'}</td>
              <td>{l.email || '—'}</td>
              <td>{l.phone || '—'}</td>
              <td><span className={`badge-status ${l.status || 'nouveau'}`}>{l.status || 'nouveau'}</span></td>
              <td>{l.source || 'webhook'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadDetailRoute() {
  const { id } = useParams();
  const { data: leads, loading, error } = useCollection("leads");
  const lead = (leads || []).find((l) => l.id === id);

  if (loading) return <div className="card">Chargement du lead…</div>;
  if (error) return <div className="card">Erreur: {String(error)}</div>;
  if (!lead) return <div className="card">Lead introuvable</div>;
  return <LeadDetail lead={lead} />;
}

function ClientDetail({ client, onCreatedFile }) {
  const { data: events, loading } = useFetch(client ? `${API_BASE}/clients/${client.id}/events` : null);
  const [creatingFile, setCreatingFile] = useState(false);
  if (!client) return <div className="card">Sélectionne un client</div>;

  const createFileForClient = async () => {
    setCreatingFile(true);
    try {
      const res = await createFileSafeClient({
        pack: client.pack || "validation",
        statutGlobal: "en_cours",
        title: `Dossier ${client.name || "Dossier"}`,
      });
      if (onCreatedFile) onCreatedFile();
      alert(`Dossier créé (${res.reference})`);
    } catch (err) {
      alert(`Erreur création dossier: ${err.message}`);
    } finally {
      setCreatingFile(false);
    }
  };
  return (
    <div className="card">
      <h3>{client.name || 'Sans nom'}</h3>
      <div className="small">{client.email || '—'} · {client.phone || '—'}</div>
      <div className="pill" style={{ marginTop: 6 }}>{client.pack || 'validation'} • {client.segment || 'small'} • {client.status || 'actif'}</div>
      <div style={{ marginTop: 8 }}>
        <button disabled={creatingFile} onClick={createFileForClient} className="btn-primary">
          {creatingFile ? "Création..." : "Créer un dossier pour ce client"}
        </button>
      </div>
      <h4 style={{ marginTop: 16 }}>Historique client</h4>
      {loading && <div>Chargement…</div>}
      <div className="event-list">
        {(events || []).map((e) => (
          <div className="event-item" key={e.id}>
            <div><strong>{e.type}</strong></div>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
              {JSON.stringify(e.payload, null, 2)}
            </pre>
            <div className="small">{e.at?.seconds ? new Date(e.at.seconds * 1000).toLocaleString() : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FileDetail({ file, attachments, setAttachments }) {
  const { data: events, loading } = useFetch(file ? `${API_BASE}/files/${file.id}/events` : null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(file || {});
  const fileAttachments = file ? (attachments[file.id] || []) : [];

  useEffect(() => {
    setForm(file || {});
  }, [file]);

  if (!file) return <div className="card">Sélectionne un dossier</div>;

  const persist = (next) => {
    setAttachments(next);
    try {
      localStorage.setItem("saf-attachments", JSON.stringify(next));
    } catch (_e) { /* ignore storage quota */ }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const mapped = await Promise.all(files.map((f) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        name: f.name,
        type: f.type,
        size: f.size,
        preview: reader.result || "",
        openUrl: reader.result || "",
        file: f,
      });
      reader.readAsDataURL(f);
    })));
    // stockage local uniquement (l’API n’expose pas encore /attachments)
    const nextLocal = {
      ...attachments,
      [file.id]: [
        ...(attachments[file.id] || []),
        ...mapped.map(({ file: _f, ...rest }) => rest),
      ],
    };
    persist(nextLocal);
    setUploading(false);
    e.target.value = "";
  };

  const removeAtt = async (idx) => {
    const target = (attachments[file.id] || [])[idx];
    const copy = { ...(attachments || {}) };
    copy[file.id] = (copy[file.id] || []).filter((_, i) => i !== idx);
    persist(copy);
    if (target?.name) {
      try {
        await fetch(`${API_BASE}/files/${file.id}/attachments?name=${encodeURIComponent(target.name)}`, {
          method: "DELETE",
          headers: { "X-Api-Token": API_TOKEN },
        });
      } catch (err) {
        console.warn("Suppression serveur échouée, conservée local", err);
      }
    }
  };

  const openAttachment = async (att, idx) => {
    let url = att.url || att.openUrl || att.preview;
    if (!url && file?.id) {
      try {
        const res = await fetch(`${API_BASE}/files/${file.id}/attachments`, { headers: { "X-Api-Token": API_TOKEN } });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            const match = list.find((a) => a.name === att.name) || list[idx];
            if (match?.url) {
              url = match.url;
              const next = {
                ...attachments,
                [file.id]: (attachments[file.id] || []).map((a, i) =>
                  i === idx ? { ...a, url: match.url, preview: match.url, openUrl: match.url } : a
                ),
              };
              persist(next);
            }
          }
        }
      } catch (err) {
        console.warn("Fetch attachment failed", err);
      }
    }
    if (url) window.open(url, "_blank", "noopener");
  };

  const saveFile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Api-Token": API_TOKEN },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || res.statusText);
      alert("Dossier sauvegardé");
    } catch (err) {
      alert(`Erreur sauvegarde: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="file-header">
        <div>
          <div className="pill soft">
            {form.statutGlobal || form.status || "en_cours"} • {form.pack || "validation"}
          </div>
          <h3 style={{ margin: "6px 0 0" }}>{file.title || "Dossier"}</h3>
          <div className="small">Client : {file.clientId || "—"} | Prix : {file.price || "—"} | Puissance : {file.power || "—"} | Adresse : {file.address || "—"}</div>
        </div>
      </div>
      <form className="form-grid" onSubmit={saveFile}>
        <div className="grid-2">
          <div className="field">
            <label>Titre</label>
            <input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="field">
            <label>Client ID</label>
            <input value={form.clientId || ''} onChange={(e) => setForm({ ...form, clientId: e.target.value })} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Pack</label>
            <select value={form.pack || 'validation'} onChange={(e) => setForm({ ...form, pack: e.target.value })}>
              {PACKS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Statut</label>
            <select value={form.status || 'en_cours'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="en_cours">En cours</option>
              <option value="en_attente">En attente</option>
              <option value="incomplet">Incomplet</option>
              <option value="finalise">Finalisé</option>
              <option value="bloque">Bloqué</option>
              <option value="clos">Clos</option>
              <option value="gagne">Gagné</option>
              <option value="perdu">Perdu</option>
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Prix €</label>
            <input value={form.price || ''} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div className="field">
            <label>Adresse</label>
            <input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Puissance kWc</label>
            <input value={form.power || ''} onChange={(e) => setForm({ ...form, power: e.target.value })} />
          </div>
          <div className="field">
            <label>Mairie</label>
            <select value={form.mairieStatus || 'a_faire'} onChange={(e) => setForm({ ...form, mairieStatus: e.target.value })}>
              <option value="a_faire">À faire</option>
              <option value="depots">Déposée</option>
              <option value="acceptee">Acceptée</option>
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Consuel</label>
            <select value={form.consuelStatus || 'a_faire'} onChange={(e) => setForm({ ...form, consuelStatus: e.target.value })}>
              <option value="a_faire">À faire</option>
              <option value="planifie">Planifié</option>
              <option value="ok">OK</option>
            </select>
          </div>
          <div className="field">
            <label>Enedis</label>
            <select value={form.enedisStatus || 'a_faire'} onChange={(e) => setForm({ ...form, enedisStatus: e.target.value })}>
              <option value="a_faire">À faire</option>
              <option value="planifie">Planifié</option>
              <option value="ok">OK</option>
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>EDF OA</label>
            <select value={form.edfStatus || 'a_faire'} onChange={(e) => setForm({ ...form, edfStatus: e.target.value })}>
              <option value="a_faire">À faire</option>
              <option value="planifie">Planifié</option>
              <option value="ok">OK</option>
            </select>
          </div>
          <div className="field">
            <label>Prochaine action</label>
            <input value={form.nextAction || ''} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Date prochaine action</label>
            <input type="date" value={form.nextActionDate ? String(form.nextActionDate).substring(0, 10) : ''} onChange={(e) => setForm({ ...form, nextActionDate: e.target.value })} />
          </div>
          <div className="field">
            <label>Date dépôt mairie</label>
            <input type="date" value={form.mairieDepositDate ? String(form.mairieDepositDate).substring(0, 10) : ''} onChange={(e) => setForm({ ...form, mairieDepositDate: e.target.value })} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Date consuel</label>
            <input type="date" value={form.consuelVisitDate ? String(form.consuelVisitDate).substring(0, 10) : ''} onChange={(e) => setForm({ ...form, consuelVisitDate: e.target.value })} />
          </div>
          <div className="field">
            <label>Réf PDL / PRM Enedis</label>
            <input value={form.enedisPdL || ''} onChange={(e) => setForm({ ...form, enedisPdL: e.target.value })} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>N° contrat EDF OA</label>
            <input value={form.edfContractNumber || ''} onChange={(e) => setForm({ ...form, edfContractNumber: e.target.value })} />
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Sauvegarde..." : "Sauvegarder"}</button>
        </div>
      </form>

      <div style={{ marginTop: 16 }}>
        <h4>Pièces jointes</h4>
        <input type="file" accept="image/*,.pdf" multiple onChange={handleUpload} disabled={uploading} />
        <div className="thumb-list">
          {fileAttachments.map((att, idx) => (
            <div key={idx} className="thumb">
              <button
                className="thumb-preview"
                onClick={() => openAttachment(att, idx)}
                title="Ouvrir"
              >
                {att.type?.includes("pdf") ? (
                  <div className="thumb-pdf">PDF</div>
                ) : (
                  <img src={att.preview || att.url || att.openUrl} alt={att.name} />
                )}
              </button>
              <div className="thumb-name" title={att.name}>{att.name}</div>
              <button className="btn-icon del" style={{ marginTop: 6 }} onClick={() => removeAtt(idx)}>Supprimer</button>
            </div>
          ))}
          {!fileAttachments.length && <div className="small">Glisse-dépose ou choisis un PDF/JPG/PNG.</div>}
        </div>
      </div>
      <h4 style={{ marginTop: 16 }}>Historique dossier</h4>
      {loading && <div>Chargement…</div>}
      <div className="event-list">
        {(events || []).map((e) => (
          <div className="event-item" key={e.id}>
            <div><strong>{e.type}</strong></div>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
              {JSON.stringify(e.payload, null, 2)}
            </pre>
            <div className="small">{e.at?.seconds ? new Date(e.at.seconds * 1000).toLocaleString() : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MainApp() {
  const { user, claims, loading: authLoading } = useAuth();
  const [leadPage, setLeadPage] = useState(0);
  const [filePage, setFilePage] = useState(0);
  const [leadPageSize, setLeadPageSize] = useState(50);
  const [filePageSize, setFilePageSize] = useState(20);
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState('dashboard');
  const [leadTab, setLeadTab] = useState("new");
  const [category, setCategory] = useState('Panneaux photovoltaïques');
  const [market, setMarket] = useState('BtoC');
  const [attachments, setAttachments] = useState({});
  const [adminKey, setAdminKey] = useState(() => (typeof window !== "undefined" ? sessionStorage.getItem("ADMIN_API_KEY") || "" : ""));
  const { data: clients } = useFetch(`${API_BASE}/clients`, [reloadKey]);
  const { data: filesResp } = useFetch(`${API_BASE}/files?limit=${filePageSize}&offset=${filePage * filePageSize}`, [reloadKey, filePage, filePageSize]);
  const { data: stats } = useFetch(`${API_BASE}/stats`, [reloadKey]);
  useEffect(() => {
    const handler = () => setReloadKey((k) => k + 1);
    window.addEventListener('saf-reload', handler);
    return () => window.removeEventListener('saf-reload', handler);
  }, []);
  const { data: leads } = useCollection("leads");
  const { data: firebaseClients } = useCollection("clients");
  const { data: firebaseFiles } = useCollection("files");
  const [selected, setSelected] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [creating, setCreating] = useState(false);
  const [leadFilters, setLeadFilters] = useState({ email: "", search: "" });
  const [fileFilters, setFileFilters] = useState({ status: "", pack: "", client: "" });
  const [clientFilters, setClientFilters] = useState({ search: "", pack: "", segment: "" });
  const [previewClient, setPreviewClient] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", source: "landing" });
  const [clientForm, setClientForm] = useState({ name: "", email: "", phone: "", company: "", pack: "validation", segment: "small", status: "actif" });
  const [fileForm, setFileForm] = useState({ title: "", clientId: "", pack: "validation", price: "", status: "en_cours", address: "", power: "", mairieDepositDate: "", consuelVisitDate: "", enedisPdL: "", edfContractNumber: "", nextAction: "", nextActionDate: "" });
  const [landingHooked, setLandingHooked] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);
  const [editingFileId, setEditingFileId] = useState(null);
  const [creatingFileForClient, setCreatingFileForClient] = useState(false);
  useEffect(() => {
    setLeadPage(0);
  }, [leadTab, leadFilters.email, leadFilters.search, leadPageSize]);
  const exportFilesCSV = () => {
    const rows = [
      ["id", "title", "clientId", "status", "pack", "price", "address", "power"]
    ];
    (filteredFiles || []).forEach(f => {
      rows.push([
        f.id || "",
        f.title || "",
        f.clientId || "",
        f.status || "",
        f.pack || "",
        f.price || "",
        f.address || "",
        f.power || ""
      ]);
    });
    const csv = rows.map(r => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dossiers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const createFileForClient = async (client) => {
    if (creatingFileForClient) return;
    setCreatingFileForClient(true);
    try {
      const res = await createFileSafeClient({
        pack: client?.pack || "validation",
        statutGlobal: "en_cours",
        title: `Dossier ${client?.name || "Dossier"}`,
      });
      setReloadKey((k) => k + 1);
      alert(`Dossier créé (${res.reference})`);
    } catch (err) {
      alert(`Erreur création dossier: ${err.message}`);
    } finally {
      setCreatingFileForClient(false);
    }
  };

  const createLead = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Token": API_TOKEN },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || res.statusText);
      setForm({ name: "", email: "", phone: "", source: "landing" });
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(`Erreur création: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const createClient = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Token": API_TOKEN },
        body: JSON.stringify({ ...clientForm, id: editingClientId || undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || res.statusText);
      setClientForm({ name: "", email: "", phone: "", company: "", pack: "validation", segment: "small", status: "actif" });
      setEditingClientId(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(`Erreur création client: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };
  if (filesResp && !Array.isArray(filesResp.items)) {
    console.error('Bad files payload', filesResp);
  }
  const leadsFirebase = Array.isArray(leads) ? leads : [];
  const files = Array.isArray(filesResp?.items) ? filesResp.items : [];
  const filesTotal = typeof filesResp?.total === 'number' ? filesResp.total : 0;
  const landingSnippet = `POST ${API_BASE}/leads
Headers: Content-Type: application/json
         X-Api-Token: ${API_TOKEN}
Body: { "name": "...", "email": "...", "phone": "...", "source": "landing" }`;

  const ordered = useMemo(
    () => (leadsFirebase || []).slice().sort((a, b) => {
      const aDate = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt || 0);
      const bDate = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt || 0);
      return bDate - aDate;
    }),
    [leadsFirebase]
  );
  const filteredLeads = useMemo(() => {
    return (ordered || []).filter((l) => {
      const matchEmail = leadFilters.email ? (l.email || "").toLowerCase().includes(leadFilters.email.toLowerCase()) : true;
      const matchSearch = leadFilters.search
        ? (l.name || "").toLowerCase().includes(leadFilters.search.toLowerCase()) ||
          (l.phone || "").toLowerCase().includes(leadFilters.search.toLowerCase()) ||
          (l.email || "").toLowerCase().includes(leadFilters.search.toLowerCase())
        : true;
      return matchEmail && matchSearch;
    });
  }, [ordered, leadFilters]);

  const filteredFiles = useMemo(() => {
    return (files || []).filter((f) => {
      const matchStatus = fileFilters.status ? (f.status || '').toLowerCase() === fileFilters.status : true;
      const matchPack = fileFilters.pack ? (f.pack || '').toLowerCase() === fileFilters.pack : true;
      const matchClient = fileFilters.client ? (f.clientId || '').toLowerCase().includes(fileFilters.client.toLowerCase()) : true;
      return matchStatus && matchPack && matchClient;
    });
  }, [files, fileFilters]);

  const filteredClients = useMemo(() => {
    return (firebaseClients || []).filter((c) => {
      const q = clientFilters.search.toLowerCase();
      const matchSearch = q
        ? (c.name || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q)
        : true;
      const matchPack = clientFilters.pack ? (c.pack || '').toLowerCase() === clientFilters.pack : true;
      const matchSegment = clientFilters.segment ? (c.segment || '').toLowerCase() === clientFilters.segment : true;
      return matchSearch && matchPack && matchSegment;
    });
  }, [firebaseClients, clientFilters]);

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>Solaire Admin</h2>
        {[
          { key: 'dashboard', label: 'Tableau de bord', icon: <HomeIcon /> },
          { key: 'leads', label: 'Leads', icon: <LeadsIcon /> },
          { key: 'clients', label: 'Clients', icon: <UsersIcon /> },
          { key: 'files', label: 'Dossiers', icon: <FolderIcon /> },
        ].map((t) => (
          <div key={t.key} className={`nav-item ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            <span className="nav-ico">{t.icon}</span> {t.label}
          </div>
        ))}
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="top-left">
            <h2 style={{ margin: 0 }}>Solaire Admin Facile</h2>
            <div className="small">Leads et pipeline synchronisés depuis le webhook CRM</div>
            <div className="top-filters">
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>Panneaux photovoltaïques</option>
              </select>
              <select value={market} onChange={(e) => setMarket(e.target.value)}>
                <option value="BtoC">BtoC</option>
                <option value="BtoB">BtoB</option>
              </select>
            </div>
            {stats && (
              <div className="mini-stats">
                <div className="mini-card">
                  <div className="mini-label">Leads</div>
                  <div className="mini-value">{stats.leads?.total || 0}</div>
                </div>
                <div className="mini-card">
                  <div className="mini-label">Dossiers</div>
                  <div className="mini-value">{stats.files?.total || 0}</div>
                </div>
                <div className="mini-card">
                  <div className="mini-label">Clients</div>
                  <div className="mini-value">{stats.clients?.total || 0}</div>
                </div>
              </div>
            )}
          </div>
          <div className="searchbar">
            <input placeholder="Recherche (nom, email, téléphone)" value={leadFilters.search} onChange={(e) => setLeadFilters({ ...leadFilters, search: e.target.value })} />
          </div>
        </div>

      {tab === 'dashboard' && stats && (
        <div className="cards">
          <div className="metric">
            <h4>Leads</h4>
            <div className="big">{stats.leads?.total || 0}</div>
            <div className="sub">Nouveau: {stats.leads?.byStatus?.nouveau || 0} · En cours: {stats.leads?.byStatus?.en_cours || 0} · Gagné: {stats.leads?.byStatus?.gagne || 0}</div>
          </div>
          <div className="metric">
            <h4>Dossiers</h4>
            <div className="big">{stats.files?.total || 0}</div>
            <div className="sub">En cours: {stats.files?.byStatus?.en_cours || 0} · Bloqué: {stats.files?.byStatus?.bloque || 0} · Finalisé: {stats.files?.byStatus?.finalise || 0}</div>
          </div>
          <div className="metric">
            <h4>Clients</h4>
            <div className="big">{stats.clients?.total || 0}</div>
            <div className="sub">Actifs/VIP à affiner</div>
          </div>
        </div>
      )}


      {stats?.leads && tab === 'dashboard' && (
        <div className="kanban-wrapper">
          <Kanban leads={leadsFirebase || []} />
        </div>
      )}

      {tab === 'leads' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="grid-2">
            <div className="field">
              <label>Email</label>
              <input value={leadFilters.email} onChange={(e) => setLeadFilters({ ...leadFilters, email: e.target.value })} placeholder="Filtrer par email" />
            </div>
            <div className="field">
              <label>Recherche</label>
              <input value={leadFilters.search} onChange={(e) => setLeadFilters({ ...leadFilters, search: e.target.value })} placeholder="Nom, email ou téléphone" />
            </div>
          </div>
        </div>
      )}

      {tab === 'leads' && !leadsFirebase?.length && (
        <div className="card">
          <p>Aucun lead. Pour en créer un, utilise l'API :</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{landingSnippet}</pre>
        </div>
      )}

      {tab === 'leads' && leadsFirebase?.length > 0 && (
        <LeadsTable leads={filteredLeads} />
      )}

      {tab === 'clients' && (
        <div className="grid-2">
          <div className="card">
            <div className="grid-3">
              <div className="field">
                <label>Recherche</label>
                <input value={clientFilters.search} onChange={(e) => setClientFilters({ ...clientFilters, search: e.target.value })} placeholder="Nom, email, téléphone" />
              </div>
              <div className="field">
                <label>Pack</label>
                <select value={clientFilters.pack} onChange={(e) => setClientFilters({ ...clientFilters, pack: e.target.value })}>
                  <option value="">Tous</option>
                  {PACKS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Segment</label>
                <select value={clientFilters.segment} onChange={(e) => setClientFilters({ ...clientFilters, segment: e.target.value })}>
                  <option value="">Tous</option>
                  <option value="small">Small</option>
                  <option value="mid">Mid</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Pack</th>
                  <th>Segment</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c) => (
                  <tr key={c.id} className="clickable-row" onClick={() => setSelectedClient(c)} style={{ cursor: "pointer" }}>
                    <td>{c.name || "—"}</td>
                    <td>{c.email || "—"}</td>
                    <td>{c.phone || "—"}</td>
                    <td>{c.pack || "validation"}</td>
                    <td>{c.segment || "small"}</td>
                    <td><span className="badge-status">{c.status || "actif"}</span></td>
                    <td>
                      <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); setEditingClientId(c.id); setClientForm(c); }}>Éditer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ClientDetail client={selectedClient} onCreatedFile={() => setReloadKey((k) => k + 1)} />
        </div>
      )}

      {tab === 'files' && (
        <div className="grid">
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="grid-4">
              <div className="field">
                <label>Statut</label>
                <select value={fileFilters.status} onChange={(e) => setFileFilters({ ...fileFilters, status: e.target.value })}>
                  <option value="">Tous</option>
                  <option value="nouveau">Nouveau</option>
                  <option value="en_cours">En cours</option>
                  <option value="en_attente">En attente</option>
                  <option value="incomplet">Incomplet</option>
                  <option value="bloque">Bloqué</option>
                  <option value="finalise">Finalisé</option>
                  <option value="clos">Clos</option>
                  <option value="gagne">Gagné</option>
                  <option value="perdu">Perdu</option>
                </select>
              </div>
              <div className="field">
                <label>Pack</label>
                <select value={fileFilters.pack} onChange={(e) => setFileFilters({ ...fileFilters, pack: e.target.value })}>
                  <option value="">Tous</option>
                  {PACKS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Client ID</label>
                <input value={fileFilters.client} onChange={(e) => setFileFilters({ ...fileFilters, client: e.target.value })} placeholder="Filtrer par client" />
              </div>
              <div className="field">
                <label>Taille page</label>
                <select value={filePageSize} onChange={(e) => setFilePageSize(parseInt(e.target.value, 10) || 20)}>
                  <option value={10}>10/page</option>
                  <option value={20}>20/page</option>
                  <option value={50}>50/page</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Client</th>
                  <th>Statut</th>
                  <th>Pack</th>
                  <th>Prix</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((f) => (
                  <tr key={f.id} className="clickable-row" onClick={() => setPreviewFile(f)} style={{ cursor: "pointer" }}>
                    <td>{f.title || f.id}</td>
                    <td>{f.clientId || "—"}</td>
                    <td><span className={`badge-status ${f.status || "en_cours"}`}>{f.status || "en_cours"}</span></td>
                    <td>{f.pack || "validation"}</td>
                    <td>{f.price || "—"}</td>
                    <td style={{ display: "flex", gap: 8 }}>
                      <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); setSelectedFile(f); }}>Voir</button>
                      <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); setEditingFileId(f.id); setFileForm(f); }}>Éditer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <button onClick={() => setFilePage((p) => Math.max(0, p - 1))} disabled={filePage === 0}>Précédent</button>
              <div>Page {filePage + 1}</div>
              <button onClick={() => setFilePage((p) => p + 1)} disabled={(filePage + 1) * filePageSize >= filesTotal}>Suivant</button>
              <button className="btn-secondary" onClick={exportFilesCSV} style={{ marginLeft: "auto" }}>Exporter CSV</button>
            </div>
          </div>

          <div className="card" style={{ gridColumn: "1 / 3" }}>
            <h3>Créer un lead</h3>
            <form className="form-grid" onSubmit={createLead}>
              <div className="grid-2">
                <div className="field"><label>Nom</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="field"><label>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div className="grid-2">
                <div className="field"><label>Téléphone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="field"><label>Source</label><input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
              </div>
              <button className="btn-primary" type="submit" disabled={creating}>{creating ? "Création..." : "Créer"}</button>
            </form>
          </div>

          <div className="card" style={{ gridColumn: "3 / 5" }}>
            <h3>Créer / éditer client</h3>
            <form className="form-grid" onSubmit={createClient}>
              <div className="grid-2">
                <div className="field"><label>Nom</label><input value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} /></div>
                <div className="field"><label>Email</label><input value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} /></div>
              </div>
              <div className="grid-2">
                <div className="field"><label>Téléphone</label><input value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} /></div>
                <div className="field"><label>Entreprise</label><input value={clientForm.company} onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })} /></div>
              </div>
              <div className="grid-3">
                <div className="field">
                  <label>Pack</label>
                  <select value={clientForm.pack} onChange={(e) => setClientForm({ ...clientForm, pack: e.target.value })}>
                    {PACKS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Segment</label>
                  <select value={clientForm.segment} onChange={(e) => setClientForm({ ...clientForm, segment: e.target.value })}>
                    <option value="small">Small</option>
                    <option value="mid">Mid</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
                <div className="field">
                  <label>Statut</label>
                  <select value={clientForm.status} onChange={(e) => setClientForm({ ...clientForm, status: e.target.value })}>
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>
              </div>
              <button className="btn-primary" type="submit" disabled={creating}>{creating ? "Sauvegarde..." : "Sauvegarder"}</button>
              {editingClientId && <button className="btn-secondary" type="button" onClick={() => { setEditingClientId(null); setClientForm({ name: "", email: "", phone: "", company: "", pack: "validation", segment: "small", status: "actif" }); }}>Réinitialiser</button>}
            </form>
          </div>

          <div className="card" style={{ gridColumn: "1 / 3" }}>
            <h3>Créer / éditer un dossier</h3>
            <form className="form-grid" onSubmit={async (e) => {
              e.preventDefault();
              setCreating(true);
              try {
                const res = await fetch(`${API_BASE}/files${editingFileId ? `/${editingFileId}` : ""}`, {
                  method: editingFileId ? "PATCH" : "POST",
                  headers: { "Content-Type": "application/json", "X-Api-Token": API_TOKEN },
                  body: JSON.stringify({ ...fileForm, id: editingFileId || undefined }),
                });
                const body = await res.json();
                if (!res.ok) throw new Error(body?.error || res.statusText);
                setFileForm({ title: "", clientId: "", pack: "validation", price: "", status: "en_cours", address: "", power: "", mairieDepositDate: "", consuelVisitDate: "", enedisPdL: "", edfContractNumber: "", nextAction: "", nextActionDate: "" });
                setEditingFileId(null);
                setReloadKey((k) => k + 1);
              } catch (err) {
                alert(`Erreur création dossier: ${err.message}`);
              } finally {
                setCreating(false);
              }
            }}>
              <div className="grid-2">
                <div className="field"><label>Titre</label><input value={fileForm.title} onChange={(e) => setFileForm({ ...fileForm, title: e.target.value })} /></div>
                <div className="field"><label>Client ID</label><input value={fileForm.clientId} onChange={(e) => setFileForm({ ...fileForm, clientId: e.target.value })} /></div>
              </div>
              <div className="grid-3">
                <div className="field">
                  <label>Pack</label>
                  <select value={fileForm.pack} onChange={(e) => setFileForm({ ...fileForm, pack: e.target.value })}>
                    {PACKS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Statut</label>
                  <select value={fileForm.status} onChange={(e) => setFileForm({ ...fileForm, status: e.target.value })}>
                    <option value="en_cours">En cours</option>
                    <option value="en_attente">En attente</option>
                    <option value="incomplet">Incomplet</option>
                    <option value="finalise">Finalisé</option>
                    <option value="bloque">Bloqué</option>
                    <option value="clos">Clos</option>
                    <option value="gagne">Gagné</option>
                    <option value="perdu">Perdu</option>
                  </select>
                </div>
                <div className="field">
                  <label>Prix</label>
                  <input value={fileForm.price} onChange={(e) => setFileForm({ ...fileForm, price: e.target.value })} />
                </div>
              </div>
              <div className="grid-2">
                <div className="field"><label>Adresse</label><input value={fileForm.address} onChange={(e) => setFileForm({ ...fileForm, address: e.target.value })} /></div>
                <div className="field"><label>Puissance</label><input value={fileForm.power} onChange={(e) => setFileForm({ ...fileForm, power: e.target.value })} /></div>
              </div>
              <div className="grid-2">
                <div className="field"><label>Mairie dépôt</label><input type="date" value={fileForm.mairieDepositDate} onChange={(e) => setFileForm({ ...fileForm, mairieDepositDate: e.target.value })} /></div>
                <div className="field"><label>Consuel visite</label><input type="date" value={fileForm.consuelVisitDate} onChange={(e) => setFileForm({ ...fileForm, consuelVisitDate: e.target.value })} /></div>
              </div>
              <div className="grid-2">
                <div className="field"><label>Enedis PDL</label><input value={fileForm.enedisPdL} onChange={(e) => setFileForm({ ...fileForm, enedisPdL: e.target.value })} /></div>
                <div className="field"><label>EDF contrat</label><input value={fileForm.edfContractNumber} onChange={(e) => setFileForm({ ...fileForm, edfContractNumber: e.target.value })} /></div>
              </div>
              <div className="grid-2">
                <div className="field"><label>Next action</label><input value={fileForm.nextAction} onChange={(e) => setFileForm({ ...fileForm, nextAction: e.target.value })} /></div>
                <div className="field"><label>Date action</label><input type="date" value={fileForm.nextActionDate} onChange={(e) => setFileForm({ ...fileForm, nextActionDate: e.target.value })} /></div>
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea value={fileForm.notes} onChange={(e) => setFileForm({ ...fileForm, notes: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn-primary" type="submit" disabled={creating}>{creating ? "Sauvegarde..." : "Sauvegarder"}</button>
                {editingFileId && <button className="btn-secondary" type="button" onClick={() => { setEditingFileId(null); setFileForm({ title: "", clientId: "", pack: "validation", price: "", status: "en_cours", address: "", power: "", mairieDepositDate: "", consuelVisitDate: "", enedisPdL: "", edfContractNumber: "", nextAction: "", nextActionDate: "" }); }}>Réinitialiser</button>}
              </div>
            </form>
          </div>

          <div className="card" style={{ gridColumn: "3 / 5" }}>
            <h3>Fiche dossier</h3>
            <FileDetail file={selectedFile} attachments={attachments} setAttachments={setAttachments} />
          </div>
        </div>
      )}

      {tab === 'leads' && selected && (
        <div className="card">
          <h3>{selected.name || 'Lead'}</h3>
          <div className="small">Email: {selected.email || '—'} · Tel: {selected.phone || '—'}</div>
        </div>
      )}

      {tab === 'leads' && (
        <div className="card">
          <h3>API Landing</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{landingSnippet}</pre>
        </div>
      )}

      {tab === 'clients' && (
        <div className="card">
          <h3>Formulaire client</h3>
          <div className="grid-2">
            <div className="field">
              <label>Nom</label>
              <input value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Téléphone</label>
              <input value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>Company</label>
              <input value={clientForm.company} onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })} />
            </div>
          </div>
          <div className="grid-3">
            <div className="field">
              <label>Pack</label>
              <select value={clientForm.pack} onChange={(e) => setClientForm({ ...clientForm, pack: e.target.value })}>
                {PACKS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Segment</label>
              <select value={clientForm.segment} onChange={(e) => setClientForm({ ...clientForm, segment: e.target.value })}>
                <option value="small">Small</option>
                <option value="mid">Mid</option>
                <option value="vip">VIP</option>
              </select>
            </div>
            <div className="field">
              <label>Statut</label>
              <select value={clientForm.status} onChange={(e) => setClientForm({ ...clientForm, status: e.target.value })}>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginAdmin />} />
      <Route path="/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/dossiers/:id" element={<AdminRoute><AdminFileDetail /></AdminRoute>} />
      <Route path="/planning" element={<AdminRoute><AdminPlanning /></AdminRoute>} />
      <Route path="/operator" element={<AdminRoute><OperatorBoard /></AdminRoute>} />
      <Route path="/leads/:id" element={<AdminRoute><LeadDetailRoute /></AdminRoute>} />
      <Route path="/dev/seed" element={<AdminRoute><DevSeed /></AdminRoute>} />
      <Route path="/admin/fix-installer" element={<AdminRoute><FixInstallerIds /></AdminRoute>} />
      <Route path="/debug/auth" element={<AuthDebug />} />

      <Route path="/client/login" element={<ClientLogin />} />
      <Route path="/client/dashboard" element={<ClientRoute><ClientDashboard /></ClientRoute>} />
      <Route path="/client/dossiers" element={<ClientRoute><ClientFiles /></ClientRoute>} />
      <Route path="/client/dossiers/:id" element={<ClientRoute><ClientFileDetail /></ClientRoute>} />

      <Route path="/" element={<AdminRoute><MainApp /></AdminRoute>} />
      <Route path="/*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading || !user) {
    if (!loading && !user) return <Navigate to="/login" replace />;
    return <div className="page-loader">Chargement de la session…</div>;
  }

  // En mode dev très permissif : dès qu'un user existe, on laisse passer
  return children;
}
