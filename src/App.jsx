import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = 'https://solaire-api-828508661560.europe-west1.run.app';
const API_TOKEN = 'saftoken-123';
const formatDate = (ts) => {
  if (!ts) return "—";
  const d = ts?._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR");
};
const tsToDate = (ts) => {
  if (!ts) return null;
  const d = ts?._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
};
const PACK_OPTIONS = [
  { code: "ESSENTIEL", label: "Essentiel", price: 169 },
  { code: "PRO", label: "Pro", price: 269 },
  { code: "SERENITE", label: "Sérénité", price: 449 },
  { code: "FLEX", label: "Flex", price: null },
];
const packLabel = (item) => {
  if (!item) return "—";
  if (item.packLabel) {
    if (typeof item.packLabel === "object") return item.packLabel.label || item.packLabel.code || "—";
    return item.packLabel;
  }
  if (item.pack && typeof item.pack === "object") {
    return item.pack.label || item.pack.code || "—";
  }
  if (item.pack) return item.pack;
  if (item.packCode) return item.packCode;
  return "—";
};
const packPrice = (item) => {
  if (!item) return "—";
  if (item.packPrice !== undefined && item.packPrice !== null && item.packPrice !== "") return item.packPrice;
  if (item.price !== undefined && item.price !== null && item.price !== "") return item.price;
  if (item.pack && typeof item.pack === "object" && item.pack.basePrice !== undefined) return item.pack.basePrice;
  return "—";
};

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
  return (
    <div className="card">
      <table className="table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Entreprise</th>
            <th>Email</th>
            <th>Téléphone</th>
            <th>Pack</th>
            <th>Prix €</th>
            <th>Date</th>
            <th>Statut</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id} onClick={() => onSelect(l)} style={{ cursor: 'pointer' }}>
              <td>{l.name || '—'}</td>
              <td>{l.company || l.companyName || '—'}</td>
              <td>{l.email || '—'}</td>
              <td>{l.phone || '—'}</td>
              <td>{packLabel(l)}</td>
              <td>{packPrice(l)}</td>
              <td>{formatDate(l.createdAt)}</td>
              <td><span className={`badge-status ${l.status || 'nouveau'}`}>{l.status || 'nouveau'}</span></td>
              <td>{l.source || 'webhook'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadDetail({ lead, clientsById }) {
  const { data: events, loading } = useFetch(lead ? `${API_BASE}/leads/${lead.id}/events` : null);
  const [converting, setConverting] = useState(false);
  if (!lead) return <div className="card">Sélectionne un lead</div>;
  const linkedClientLabel = lead?.clientId
    ? (clientsById?.[lead.clientId]?.company || clientsById?.[lead.clientId]?.name || lead.clientId)
    : null;

  const convert = async () => {
    if (lead?.clientId) return;
    setConverting(true);
    try {
      const res = await fetch(`${API_BASE}/leads/${lead.id}/convert`, { method: "POST", headers: { "Content-Type": "application/json", "X-Api-Token": API_TOKEN }, body: JSON.stringify({}) });
      const body = await res.json();
      if (!res.ok) {
        if (res.status === 409 || body?.error === "lead_already_converted") throw new Error("Ce lead a déjà été converti");
        throw new Error(body?.error || res.statusText);
      }
      if (body?.clientId && typeof window !== "undefined") {
        lead.clientId = body.clientId;
      }
      // rafraîchir sans recharger la page
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('saf-reload'));
      }
    } catch (err) {
      alert(`Erreur conversion: ${err.message}`);
    } finally {
      setConverting(false);
    }
  };
  return (
    <div className="card">
      <h3>{lead.name || 'Sans nom'}</h3>
      <div className="small">{lead.company || lead.companyName || '—'}</div>
      <div className="small">{lead.email || '—'} · {lead.phone || '—'}</div>
      <div className="small">Pack : {packLabel(lead)} · Prix : {packPrice(lead)} €</div>
      <div className="small">Créé le : {formatDate(lead.createdAt)}</div>
      <div className="badge" style={{ marginTop: 8 }}>{lead.status || 'nouveau'}</div>
      {linkedClientLabel && <div className="pill" style={{ marginTop: 6 }}>Client lié : {linkedClientLabel}</div>}
      {lead.clientId ? (
        <div style={{ marginTop: 8 }}>
          <div className="pill soft">Ce lead a déjà été converti{lead.convertedAt ? ` le ${formatDate(lead.convertedAt)}` : ''}</div>
          {linkedClientLabel && <div className="small">Voir le client : {linkedClientLabel}</div>}
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          <button disabled={converting} onClick={convert} className="btn-primary">
            {converting ? "Conversion..." : "Convertir en client"}
          </button>
        </div>
      )}
      <h4 style={{ marginTop: 16 }}>Historique</h4>
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

function ClientDetail({ client, onCreatedFile, existingFiles = [] }) {
  const { data: events, loading } = useFetch(client ? `${API_BASE}/clients/${client.id}/events` : null);
  const [creatingFile, setCreatingFile] = useState(false);
  if (!client) return <div className="card">Sélectionne un client</div>;
  const hasFile = existingFiles.length > 0;

  const createFileForClient = async () => {
    if (hasFile) {
      alert("Un dossier existe déjà pour ce client.");
      return;
    }
    setCreatingFile(true);
    try {
      const code = (client.packCode || (typeof client.pack === "object" ? client.pack.code : client.pack) || PACK_OPTIONS[0].code).toString().toUpperCase();
      const sel = PACK_OPTIONS.find((p) => p.code === code) || PACK_OPTIONS[0];
      const res = await fetch(`${API_BASE}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Token": API_TOKEN },
        body: JSON.stringify({
          title: `Dossier ${client.name || client.id}`,
          clientId: client.id,
          packCode: sel.code,
          packLabel: sel.label,
          packPrice: sel.price,
          pack: sel.code,
          status: "en_cours",
          source: "client-conversion",
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        const msg = body?.message || body?.error || res.statusText;
        if (body?.error === "file_exists") throw new Error("Un dossier existe déjà pour ce client.");
        throw new Error(msg);
      }
      if (onCreatedFile) onCreatedFile();
      alert("Dossier créé");
    } catch (err) {
      alert(`Erreur création dossier: ${err.message}`);
    } finally {
      setCreatingFile(false);
    }
  };
  return (
    <div className="card">
      <h3>{client.name || client.company || 'Sans nom'}</h3>
      <div className="small">{client.company || '—'}</div>
      <div className="small">{client.email || '—'} · {client.phone || '—'}</div>
      <div className="pill" style={{ marginTop: 6 }}>{packLabel(client)} • {packPrice(client)} € • {client.segment || 'small'} • {client.status || 'actif'}</div>
      <div style={{ marginTop: 8 }}>
        <button disabled={creatingFile || hasFile} onClick={createFileForClient} className="btn-primary">
          {hasFile ? "Dossier déjà créé" : creatingFile ? "Création..." : "Créer un dossier pour ce client"}
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

function FileDetail({ file, attachments, setAttachments, clientsById }) {
  const { data: events, loading } = useFetch(file ? `${API_BASE}/files/${file.id}/events` : null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(file || {});
  const fileAttachments = file ? (attachments[file.id] || []) : [];
  const clientLabel = file
    ? (clientsById?.[file.clientId]?.company || clientsById?.[file.clientId]?.name || file.clientId || '—')
    : '—';

  useEffect(() => {
    if (!file) { setForm({}); return; }
    const rawCode = (file.packCode || (typeof file.pack === "object" ? file.pack.code : file.pack) || PACK_OPTIONS[0].code).toString().toUpperCase();
    const opt = PACK_OPTIONS.find((p) => p.code === rawCode) || PACK_OPTIONS[0];
    setForm({
      ...file,
      packCode: opt.code,
      packLabel: file.packLabel || (typeof file.pack === "object" ? file.pack.label : file.pack) || opt.label,
      packPrice: file.packPrice ?? file.price ?? opt.price,
      price: file.packPrice ?? file.price ?? opt.price,
    });
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
      } catch (_e) { /* ignore */ }
    }
    // Dernier recours: tenter de télécharger le binaire puis ouvrir
    if (!url && file?.id) {
      try {
        const res = await fetch(`${API_BASE}/files/${file.id}/attachments/${encodeURIComponent(att.name)}`, { headers: { "X-Api-Token": API_TOKEN } });
        if (res.ok) {
          const blob = await res.blob();
          url = URL.createObjectURL(blob);
          const next = {
            ...attachments,
            [file.id]: (attachments[file.id] || []).map((a, i) =>
              i === idx ? { ...a, url, openUrl: url, preview: a.preview || (blob.type.startsWith("image/") ? url : "") } : a
            ),
          };
          persist(next);
        }
      } catch (_e) { /* ignore */ }
    }
    if (url) window.open(url, "_blank", "noopener");
    else alert("Aucun aperçu dispo. Ré-uploade le PDF pour générer un lien.");
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/files/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Api-Token": API_TOKEN },
        body: JSON.stringify({ ...form, pack: form.packCode }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || res.statusText);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('saf-reload'));
      }
    } catch (err) {
      alert(`Erreur sauvegarde dossier: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="card">
      <h3>{file.title || 'Dossier sans titre'}</h3>
      <div className="info-cards">
        <div className="info-chip">
          <div className="mini-label">Statut</div>
          <div className="mini-value">{file.status || 'en_cours'}</div>
        </div>
        <div className="info-chip">
          <div className="mini-label">Pack</div>
          <div className="mini-value">{packLabel(file)}</div>
        </div>
        <div className="info-chip">
          <div className="mini-label">Client</div>
          <div className="mini-value">{clientLabel}</div>
        </div>
        <div className="info-chip">
          <div className="mini-label">Prix</div>
          <div className="mini-value">{packPrice(file)}</div>
        </div>
      </div>
      <div className="small">Puissance : {file.power || '—'} | Adresse : {file.address || '—'}</div>
      <div className="form-grid labeled" style={{ marginTop: 12 }}>
        <label>
          <span>Title</span>
          <input placeholder="Titre" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label>
          <span>Client ID</span>
          <input placeholder="Client ID" value={form.clientId || ''} onChange={(e) => setForm({ ...form, clientId: e.target.value })} />
        </label>
        <label>
          <span>Pack</span>
          <select value={form.packCode || 'ESSENTIEL'} onChange={(e) => {
            const sel = PACK_OPTIONS.find((p) => p.code === e.target.value) || PACK_OPTIONS[0];
            setForm({ ...form, packCode: sel.code, packLabel: sel.label, packPrice: sel.price });
          }}>
            {PACK_OPTIONS.map((p) => (
              <option key={p.code} value={p.code}>{p.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Statut</span>
          <select value={form.status || 'en_cours'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="en_cours">En cours</option>
            <option value="bloque">Bloqué</option>
            <option value="finalise">Finalisé</option>
          </select>
        </label>
        <label>
          <span>Prix €</span>
          <input placeholder="Prix €" value={form.packPrice ?? form.price ?? ''} onChange={(e) => setForm({ ...form, packPrice: e.target.value })} />
        </label>
        <label>
          <span>Adresse</span>
          <input placeholder="Adresse" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </label>
        <label>
          <span>Puissance kWc</span>
          <input placeholder="Puissance kWc" value={form.power || ''} onChange={(e) => setForm({ ...form, power: e.target.value })} />
        </label>
        <label>
          <span>Mairie</span>
          <select value={form.mairieStatus || 'a_faire'} onChange={(e) => setForm({ ...form, mairieStatus: e.target.value })}>
            <option value="a_faire">Mairie - à faire</option>
            <option value="depose">Mairie - déposé</option>
            <option value="valide">Mairie - validé</option>
          </select>
        </label>
        <label>
          <span>Consuel</span>
          <select value={form.consuelStatus || 'a_faire'} onChange={(e) => setForm({ ...form, consuelStatus: e.target.value })}>
            <option value="a_faire">Consuel - à faire</option>
            <option value="depose">Consuel - déposé</option>
            <option value="visite">Consuel - visite programmée</option>
            <option value="attestation">Consuel - attestation reçue</option>
          </select>
        </label>
        <label>
          <span>Enedis</span>
          <select value={form.enedisStatus || 'a_faire'} onChange={(e) => setForm({ ...form, enedisStatus: e.target.value })}>
            <option value="a_faire">Enedis - à faire</option>
            <option value="depose">Enedis - déposé</option>
            <option value="devis">Enedis - devis reçu</option>
            <option value="travaux">Enedis - travaux programmés</option>
            <option value="mise_service">Enedis - mise en service</option>
          </select>
        </label>
        <label>
          <span>EDF OA</span>
          <select value={form.edfStatus || 'a_faire'} onChange={(e) => setForm({ ...form, edfStatus: e.target.value })}>
            <option value="a_faire">EDF OA - à faire</option>
            <option value="depose">EDF OA - déposé</option>
            <option value="etude">EDF OA - en cours d'étude</option>
            <option value="signe">EDF OA - contrat signé</option>
          </select>
        </label>
        <label>
          <span>Date dépôt mairie</span>
          <input type="date" value={form.mairieDepositDate || ''} onChange={(e) => setForm({ ...form, mairieDepositDate: e.target.value })} />
        </label>
        <label>
          <span>Date visite Consuel</span>
          <input type="date" value={form.consuelVisitDate || ''} onChange={(e) => setForm({ ...form, consuelVisitDate: e.target.value })} />
        </label>
        <label>
          <span>N° PDL/PRM Enedis</span>
          <input placeholder="N° PDL/PRM Enedis" value={form.enedisPdL || ''} onChange={(e) => setForm({ ...form, enedisPdL: e.target.value })} />
        </label>
        <label>
          <span>N° contrat EDF OA</span>
          <input placeholder="N° contrat EDF OA" value={form.edfContractNumber || ''} onChange={(e) => setForm({ ...form, edfContractNumber: e.target.value })} />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          <span>Notes</span>
          <textarea placeholder="Notes" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ minHeight: 80 }} />
        </label>
      </div>
      <div style={{ marginTop: 8 }}>
        <button disabled={saving} onClick={save} className="btn-primary">
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>
      </div>
      <div className="upload-block">
        <h4>Documents</h4>
        <input type="file" accept="image/png,image/jpeg,application/pdf" multiple onChange={handleUpload} />
        {uploading && <div className="small">Upload en cours...</div>}
        <div className="thumbs">
          {fileAttachments.map((att, idx) => (
            <div className="thumb" key={`${att.name}-${idx}`}>
              <button
                className="thumb-btn"
                type="button"
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

export default function App() {
  const [leadPage, setLeadPage] = useState(0);
  const [filePage, setFilePage] = useState(0);
  const [leadPageSize, setLeadPageSize] = useState(20);
  const [filePageSize, setFilePageSize] = useState(20);
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState('dashboard');
  const [category, setCategory] = useState('Panneaux photovoltaïques');
  const [market, setMarket] = useState('BtoC');
  const [attachments, setAttachments] = useState({});
  // hydrate attachments depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("saf-attachments");
      if (saved) setAttachments(JSON.parse(saved));
    } catch (_e) { /* ignore */ }
  }, []);
  const { data: leadsResp, loading, error } = useFetch(`${API_BASE}/leads?limit=${leadPageSize}&offset=${leadPage * leadPageSize}`, [reloadKey, leadPage, leadPageSize]);
  const { data: clients } = useFetch(`${API_BASE}/clients`, [reloadKey]);
  const { data: filesResp } = useFetch(`${API_BASE}/files?limit=${filePageSize}&offset=${filePage * filePageSize}`, [reloadKey, filePage, filePageSize]);
  const { data: stats } = useFetch(`${API_BASE}/stats`, [reloadKey]);
  useEffect(() => {
    const handler = () => setReloadKey((k) => k + 1);
    window.addEventListener('saf-reload', handler);
    return () => window.removeEventListener('saf-reload', handler);
  }, []);
  const [selected, setSelected] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [creating, setCreating] = useState(false);
  const [leadFilters, setLeadFilters] = useState({ status: "", source: "", search: "" });
  const [fileFilters, setFileFilters] = useState({ status: "", pack: "", client: "" });
  const [clientFilters, setClientFilters] = useState({ search: "", pack: "", segment: "" });
  const [previewClient, setPreviewClient] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", volume: "", packCode: "ESSENTIEL", packLabel: "Essentiel", packPrice: 169, flexItems: [], status: "nouveau", source: "landing" });
  const [clientForm, setClientForm] = useState({ name: "", email: "", phone: "", company: "", packCode: "ESSENTIEL", packLabel: "Essentiel", packPrice: 169, segment: "small", status: "actif" });
  const [fileForm, setFileForm] = useState({ title: "", clientId: "", packCode: "ESSENTIEL", packLabel: "Essentiel", packPrice: 169, price: "", status: "en_cours", address: "", power: "", mairieDepositDate: "", consuelVisitDate: "", enedisPdL: "", edfContractNumber: "" });
  const [landingHooked, setLandingHooked] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);
  const [editingFileId, setEditingFileId] = useState(null);
  const [creatingFileForClient, setCreatingFileForClient] = useState(false);
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
        packLabel(f) || "",
        packPrice(f) || "",
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
    if (!client?.id || creatingFileForClient) return;
    const already = (files || []).some((f) => f.clientId === client.id && !["finalise", "clos"].includes((f.status || "").toLowerCase()));
    if (already) {
      alert("Un dossier existe déjà pour ce client.");
      return;
    }
    // Pré-remplit le formulaire dossier et ouvre l'onglet Dossiers au lieu de créer directement
    setCreatingFileForClient(true);
    setTab('files');
    setSelectedFile(null);
    setFileForm({
      title: `Dossier ${client.name || client.id}`,
      clientId: client.id,
      packCode: (client.packCode || (typeof client.pack === "object" ? client.pack.code : client.pack) || PACK_OPTIONS[0].code).toString().toUpperCase(),
      packLabel: client.packLabel || (typeof client.pack === "object" ? client.pack.label : client.pack) || PACK_OPTIONS[0].label,
      packPrice: client.packPrice ?? client.price ?? PACK_OPTIONS[0].price,
      price: client.packPrice ?? client.price ?? "",
      status: "en_cours",
      address: "",
      power: "",
      mairieDepositDate: "",
      consuelVisitDate: "",
      enedisPdL: "",
      edfContractNumber: "",
      notes: ""
    });
    setEditingFileId(null);
    // scroll vers le formulaire
    requestAnimationFrame(() => {
      const form = document.getElementById("file-form");
      if (form) form.scrollIntoView({ behavior: "smooth" });
    });
    setCreatingFileForClient(false);
  };

  const createLead = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const selectedPack = PACK_OPTIONS.find((p) => p.code === form.packCode) || PACK_OPTIONS[0];
      const res = await fetch(`${API_BASE}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Token": API_TOKEN },
        body: JSON.stringify({
          ...form,
          packCode: selectedPack.code,
          packLabel: selectedPack.label,
          packPrice: selectedPack.code === "FLEX" ? undefined : selectedPack.price,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || res.statusText);
      setForm({ name: "", company: "", email: "", phone: "", volume: "", packCode: "ESSENTIEL", packLabel: "Essentiel", packPrice: 169, flexItems: [], status: "nouveau", source: "landing" });
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
      const sel = PACK_OPTIONS.find((p) => p.code === (clientForm.packCode || clientForm.pack)) || PACK_OPTIONS[0];
      const res = await fetch(`${API_BASE}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Token": API_TOKEN },
        body: JSON.stringify({
          ...clientForm,
          id: editingClientId || undefined,
          packCode: sel.code,
          packLabel: sel.label,
          packPrice: sel.price,
          pack: sel.code,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || res.statusText);
      setClientForm({ name: "", email: "", phone: "", company: "", packCode: "ESSENTIEL", packLabel: "Essentiel", packPrice: 169, segment: "small", status: "actif" });
      setEditingClientId(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(`Erreur création client: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };
  if (leadsResp && !Array.isArray(leadsResp.items)) {
    console.error('Bad leads payload', leadsResp);
  }
  if (filesResp && !Array.isArray(filesResp.items)) {
    console.error('Bad files payload', filesResp);
  }
  const leads = Array.isArray(leadsResp?.items) ? leadsResp.items : [];
  const leadsTotal = typeof leadsResp?.total === 'number' ? leadsResp.total : 0;
  const leadsSortedByDate = useMemo(() => {
    return [...leads].sort((a, b) => {
      const da = tsToDate(a.createdAt)?.getTime() || 0;
      const db = tsToDate(b.createdAt)?.getTime() || 0;
      return db - da;
    });
  }, [leads]);
  const files = Array.isArray(filesResp?.items) ? filesResp.items : [];
  const filesTotal = typeof filesResp?.total === 'number' ? filesResp.total : 0;
const landingSnippet = `POST ${API_BASE}/leads
Headers: Content-Type: application/json
         X-Api-Token: ${API_TOKEN}
Body: { "company": "...", "name": "...", "email": "...", "phone": "...", "volume": "...", "packCode": "ESSENTIEL|PRO|SERENITE|FLEX", "packLabel": "...", "packPrice": 169, "flexItems": [], "source": "landing-diagnostic-v3" }`;

  const ordered = useMemo(
    () => (leads || []).sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)),
    [leads]
  );
  const clientsById = useMemo(() => {
    const map = {};
    (clients || []).forEach((c) => { map[c.id] = c; });
    return map;
  }, [clients]);
  const filteredLeads = useMemo(() => {
    return (ordered || []).filter((l) => {
      const matchStatus = leadFilters.status ? (l.status || '').toLowerCase() === leadFilters.status : true;
      const matchSource = leadFilters.source ? (l.source || '').toLowerCase().includes(leadFilters.source.toLowerCase()) : true;
      const matchSearch = leadFilters.search
        ? (l.name || '').toLowerCase().includes(leadFilters.search.toLowerCase()) ||
          (l.company || '').toLowerCase().includes(leadFilters.search.toLowerCase()) ||
          (l.email || '').toLowerCase().includes(leadFilters.search.toLowerCase()) ||
          (l.phone || '').toLowerCase().includes(leadFilters.search.toLowerCase())
        : true;
      return matchStatus && matchSource && matchSearch;
    });
  }, [ordered, leadFilters]);

  const filteredFiles = useMemo(() => {
    return (files || []).filter((f) => {
      const matchStatus = fileFilters.status ? (f.status || '').toLowerCase() === fileFilters.status : true;
      const packCode = (f.packCode || (typeof f.pack === "object" ? f.pack.code : f.pack) || '').toLowerCase();
      const matchPack = fileFilters.pack ? packCode === fileFilters.pack : true;
      const clientLabel = clientsById[f.clientId]?.company || clientsById[f.clientId]?.name || f.clientId || '';
      const matchClient = fileFilters.client ? clientLabel.toLowerCase().includes(fileFilters.client.toLowerCase()) : true;
      return matchStatus && matchPack && matchClient;
    });
  }, [files, fileFilters, clientsById]);

  const filteredClients = useMemo(() => {
    return (clients || []).filter((c) => {
      const q = clientFilters.search.toLowerCase();
      const matchSearch = q
        ? (c.name || '').toLowerCase().includes(q) ||
          (c.company || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q)
        : true;
      const cPackCode = (c.packCode || (typeof c.pack === "object" ? c.pack.code : c.pack) || '').toLowerCase();
      const matchPack = clientFilters.pack ? cPackCode === clientFilters.pack : true;
      const matchSegment = clientFilters.segment ? (c.segment || '').toLowerCase() === clientFilters.segment : true;
      return matchSearch && matchPack && matchSegment;
    });
  }, [clients, clientFilters]);

  const pipelineCounts = useMemo(() => {
    const counts = { nouveau: 0, contacte: 0, qualifie: 0, converti: 0 };
    const stage = (status) => {
      const s = (status || "").toLowerCase();
      if (s.includes("gagne") || s.includes("convert")) return "converti";
      if (s.includes("qualif")) return "qualifie";
      if (s.includes("en_cours") || s.includes("contact")) return "contacte";
      return "nouveau";
    };
    (leads || []).forEach((l) => {
      const st = stage(l.status);
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [leads]);

  const todoToday = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return (leads || []).filter((l) => {
      const created = tsToDate(l.createdAt);
      if (!created) return false;
      const age = now - created.getTime();
      return age > dayMs && (l.status || "").toLowerCase() === "nouveau";
    }).sort((a, b) => (tsToDate(b.createdAt)?.getTime() || 0) - (tsToDate(a.createdAt)?.getTime() || 0));
  }, [leads]);

  const latestLeads = useMemo(() => {
    return (leadsSortedByDate || []).slice(0, 5);
  }, [leadsSortedByDate]);

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
        <>
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
              <div className="sub">Prix total: {stats.files?.priceSum ?? 0} €</div>
            </div>
            <div className="metric">
              <h4>Clients</h4>
              <div className="big">{stats.clients?.total || 0}</div>
              <div className="sub">Actifs/VIP à affiner</div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <h3 style={{ margin: 0 }}>À faire aujourd'hui</h3>
              <span style={{ background: "#e53935", color: "#fff", borderRadius: 999, padding: "4px 10px", fontWeight: 600, fontSize: 12 }}>
                {todoToday.length}
              </span>
            </div>
            <div className="table-wrapper" style={{ marginTop: 8 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Entreprise</th>
                    <th>Pack</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {todoToday.slice(0, 10).map((l) => (
                    <tr key={l.id}>
                      <td>{l.company || "—"}</td>
                      <td>{packLabel(l)}</td>
                      <td>{formatDate(l.createdAt)}</td>
                    </tr>
                  ))}
                  {!todoToday.length && (
                    <tr><td colSpan={3}>Rien à traiter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Pipeline</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {[
                { key: "nouveau", label: "Nouveau" },
                { key: "contacte", label: "Contacté" },
                { key: "qualifie", label: "Qualifié" },
                { key: "converti", label: "Converti" },
              ].map((c) => (
                <div key={c.key} className="card" style={{ boxShadow: "none", border: "1px solid #e5e7eb" }}>
                  <div className="mini-label" style={{ textTransform: "uppercase", fontSize: 11 }}>{c.label}</div>
                  <div className="big" style={{ marginTop: 4 }}>{pipelineCounts[c.key] || 0}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Derniers leads</h3>
            <div className="table-wrapper" style={{ marginTop: 8 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Entreprise</th>
                    <th>Contact</th>
                    <th>Pack</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {latestLeads.map((l) => (
                    <tr key={l.id} className="clickable" onClick={() => { setTab('leads'); setSelected(l); }}>
                      <td>{l.company || "—"}</td>
                      <td>{l.name || "—"}</td>
                      <td>{packLabel(l)}</td>
                      <td>{formatDate(l.createdAt)}</td>
                    </tr>
                  ))}
                  {!latestLeads.length && (
                    <tr><td colSpan={4}>Aucun lead.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}


      {error && <div className="card">Erreur : {String(error)}</div>}
      {loading && <div className="card">Chargement…</div>}

      {tab === 'leads' && !loading && leads && (
        <div className="grid">
          <div>
            <div className="card">
              <h3>Leads</h3>
              <div className="filters">
                <select value={leadFilters.status} onChange={(e) => setLeadFilters({ ...leadFilters, status: e.target.value })}>
                  <option value="">Statut (tous)</option>
                  <option value="nouveau">Nouveau</option>
                  <option value="en_cours">En cours</option>
                  <option value="gagne">Gagné</option>
                  <option value="perdu">Perdu</option>
                </select>
                <input placeholder="Source" value={leadFilters.source} onChange={(e) => setLeadFilters({ ...leadFilters, source: e.target.value })} />
                <input placeholder="Recherche nom/entreprise/email/tel" value={leadFilters.search} onChange={(e) => setLeadFilters({ ...leadFilters, search: e.target.value })} />
                <select value={leadPageSize} onChange={(e) => { setLeadPageSize(Number(e.target.value)); setLeadPage(0); }}>
                  {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}/page</option>)}
                </select>
              </div>
              <LeadsTable leads={filteredLeads} onSelect={setSelected} />
              <div className="filters" style={{ justifyContent: "space-between" }}>
                <button className="btn-secondary" disabled={leadPage === 0} onClick={() => setLeadPage((p) => Math.max(0, p - 1))}>Précédent</button>
                <span>Page {leadPage + 1} / {Math.max(1, Math.ceil(leadsTotal / leadPageSize))} ({leadsTotal} leads)</span>
                <button className="btn-secondary" disabled={(leadPage + 1) * leadPageSize >= leadsTotal} onClick={() => setLeadPage((p) => p + 1)}>Suivant</button>
              </div>
            </div>
          </div>
          {selected?.clientId && (
            <div className="card" style={{ marginBottom: 8, background: "#fff7ed" }}>
              <div className="small">Ce lead a déjà été converti{selected.convertedAt ? ` le ${formatDate(selected.convertedAt)}` : ""}.</div>
              <div className="small">Client ID : {selected.clientId}</div>
            </div>
          )}
          <LeadDetail lead={selected} clientsById={clientsById} />
        </div>
      )}

      {tab === 'leads' && !loading && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Créer un lead manuel</h3>
          <form onSubmit={createLead} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
              <input required placeholder="Nom contact" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input placeholder="Entreprise" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input placeholder="Volume (installations/mois)" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} />
            <select
              value={form.packCode}
              onChange={(e) => {
                const sel = PACK_OPTIONS.find((p) => p.code === e.target.value) || PACK_OPTIONS[0];
                setForm({
                  ...form,
                  packCode: sel.code,
                  packLabel: sel.label,
                  packPrice: sel.code === "FLEX" ? "" : sel.price,
                  flexItems: sel.code === "FLEX" ? [] : form.flexItems,
                });
              }}
            >
              {PACK_OPTIONS.map((p) => (
                <option key={p.code} value={p.code}>{p.label}</option>
              ))}
            </select>
            {form.packCode === "FLEX" ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { code: "DP_MAIRIE", label: "DP Mairie", price: 89 },
                  { code: "CONSUEL_BLEU", label: "Consuel Bleu", price: 45 },
                  { code: "CONSUEL_VIOLET", label: "Consuel Violet", price: 65 },
                  { code: "RACCORDEMENT_ENEDIS", label: "Raccordement Enedis", price: 99 },
                  { code: "RACCORD_ENEDIS", label: "Raccordement Enedis", price: 99 }, // fallback naming
                ].map((opt) => {
                  const checked = (form.flexItems || []).some((i) => i.code === opt.code);
                  return (
                    <label key={opt.code} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = checked
                            ? (form.flexItems || []).filter((i) => i.code !== opt.code)
                            : [...(form.flexItems || []), { code: opt.code, label: opt.label, price: opt.price }];
                          setForm({ ...form, flexItems: next });
                        }}
                      />
                      {opt.label} ({opt.price}€)
                    </label>
                  );
                })}
                <div style={{ fontWeight: 600 }}>Total Flex : { (form.flexItems || []).reduce((s, i) => s + (Number(i.price) || 0), 0) } €</div>
              </div>
            ) : (
              <input placeholder="Prix €" value={form.packPrice ?? ''} onChange={(e) => setForm({ ...form, packPrice: e.target.value })} />
            )}
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="nouveau">Nouveau</option>
              <option value="en_cours">En cours</option>
              <option value="gagne">Gagné</option>
              <option value="perdu">Perdu</option>
            </select>
            <input placeholder="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            <button type="submit" disabled={creating} className="btn-primary" style={{ gridColumn: "1 / -1" }}>
              {creating ? "Création..." : "Créer le lead"}
            </button>
          </form>
        </div>
      )}

      {tab === 'leads' && !loading && leads && (
        <div style={{ marginTop: 16 }}>
          <Kanban leads={ordered} />
        </div>
      )}

      {tab === 'clients' && !loading && clients && (
        <div className="grid-clients" style={{ marginTop: 16 }}>
          <div className="card table-card">
            <div className="table-header">
              <h3>Clients</h3>
              <span className="pill soft">Total : {filteredClients.length}</span>
            </div>
            <div className="filters tight">
              <input placeholder="Recherche nom/entreprise/email/tel" value={clientFilters.search} onChange={(e) => setClientFilters({ ...clientFilters, search: e.target.value })} />
              <select value={clientFilters.pack} onChange={(e) => setClientFilters({ ...clientFilters, pack: e.target.value })}>
                <option value="">Pack (tous)</option>
                {PACK_OPTIONS.map((p) => (
                  <option key={p.code} value={p.code.toLowerCase()}>{p.label}</option>
                ))}
              </select>
              <select value={clientFilters.segment} onChange={(e) => setClientFilters({ ...clientFilters, segment: e.target.value })}>
                <option value="">Segment (tous)</option>
                <option value="small">Petit</option>
                <option value="medium">Moyen</option>
                <option value="large">Gros</option>
              </select>
            </div>
            <div className="table-wrapper sticky-head">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Entreprise</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                  <th>Pack</th>
                  <th>Prix €</th>
                  <th>Date</th>
                  <th>Segment</th>
                  <th>Statut</th>
                  <th style={{ width: 190 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((c) => (
                    <tr
                      key={c.id}
                      className={`clickable ${selectedClient?.id === c.id ? 'selected' : ''}`}
                      onClick={() => setSelectedClient(c)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{c.name || "—"}</td>
                      <td>{c.company || "—"}</td>
                      <td>{c.email || "—"}</td>
                      <td>{c.phone || "—"}</td>
                      <td>{packLabel(c)}</td>
                      <td>{packPrice(c)}</td>
                      <td>{formatDate(c.createdAt)}</td>
                      <td>{c.segment || "small"}</td>
                      <td><span className={`status-badge ${c.status || 'actif'}`}>{c.status || 'actif'}</span></td>
                      <td>
                        <div className="actions" onClick={(e) => e.stopPropagation()}>
                          <button className="btn-icon view" title="Voir la fiche" aria-label="Voir" onClick={() => { setSelectedClient(c); setPreviewClient(c); }}><EyeIcon /> Voir</button>
                          <button className="btn-icon edit" title="Éditer" aria-label="Éditer" onClick={() => {
                            const packObj = typeof c.pack === "object" ? c.pack : null;
                            const code = c.packCode || packObj?.code || (typeof c.pack === "string" ? c.pack.toUpperCase() : PACK_OPTIONS[0].code);
                            const opt = PACK_OPTIONS.find((p) => p.code === code) || PACK_OPTIONS[0];
                            setClientForm({
                              name: c.name || "",
                              email: c.email || "",
                              phone: c.phone || "",
                              company: c.company || "",
                              packCode: code,
                              packLabel: c.packLabel || packObj?.label || opt.label,
                              packPrice: c.packPrice ?? c.price ?? packObj?.basePrice ?? opt.price,
                              segment: c.segment || "small",
                              status: c.status || "actif"
                            });
                            setEditingClientId(c.id);
                          }}><EditIcon /> Éditer</button>
                          <button className="btn-icon file" title="Créer un dossier pour ce client" aria-label="Créer dossier" onClick={() => createFileForClient(c)}><FolderIcon /> Dossier</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <ClientDetail
            client={selectedClient}
            existingFiles={(files || []).filter((f) => f.clientId === (selectedClient?.id || ""))}
            onCreatedFile={() => setReloadKey((k) => k + 1)}
          />
          <div className="card">
            <h3>{editingClientId ? "Éditer le client" : "Créer un client"}</h3>
            <form onSubmit={createClient} className="two-cols">
              <input required placeholder="Nom/Entreprise" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} />
              <input placeholder="Email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
              <input placeholder="Téléphone" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} />
              <input placeholder="Société" value={clientForm.company} onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })} />
              <select value={clientForm.packCode} onChange={(e) => {
                const sel = PACK_OPTIONS.find((p) => p.code === e.target.value) || PACK_OPTIONS[0];
                setClientForm({ ...clientForm, packCode: sel.code, packLabel: sel.label, packPrice: sel.price });
              }}>
                {PACK_OPTIONS.map((p) => (
                  <option key={p.code} value={p.code}>{p.label}</option>
                ))}
              </select>
              <select value={clientForm.segment} onChange={(e) => setClientForm({ ...clientForm, segment: e.target.value })}>
                <option value="small">Petit</option>
                <option value="medium">Moyen</option>
                <option value="large">Gros</option>
              </select>
              <select value={clientForm.status} onChange={(e) => setClientForm({ ...clientForm, status: e.target.value })}>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
                <option value="vip">VIP</option>
              </select>
              <button type="submit" disabled={creating} className="btn-primary" style={{ gridColumn: "1 / -1" }}>
                {creating ? "En cours..." : editingClientId ? "Mettre à jour" : "Créer le client"}
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === 'files' && !loading && files && (
        <div className="grid" style={{ marginTop: 16 }}>
          <div className="card">
            <h3>Dossiers</h3>
            <div className="filters">
              <select value={fileFilters.status} onChange={(e) => setFileFilters({ ...fileFilters, status: e.target.value })}>
                <option value="">Statut (tous)</option>
                <option value="en_cours">En cours</option>
                <option value="bloque">Bloqué</option>
                <option value="finalise">Finalisé</option>
              </select>
              <select value={fileFilters.pack} onChange={(e) => setFileFilters({ ...fileFilters, pack: e.target.value })}>
                <option value="">Pack (tous)</option>
                {PACK_OPTIONS.map((p) => (
                  <option key={p.code} value={p.code.toLowerCase()}>{p.label}</option>
                ))}
              </select>
              <input placeholder="Client / Entreprise" value={fileFilters.client} onChange={(e) => setFileFilters({ ...fileFilters, client: e.target.value })} />
              <select value={filePageSize} onChange={(e) => { setFilePageSize(Number(e.target.value)); setFilePage(0); }}>
                {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}/page</option>)}
              </select>
            </div>
            <div className="action-bar">
              <button className="btn-secondary" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>Aller au formulaire dossier</button>
              <button className="btn-secondary" onClick={exportFilesCSV}>Exporter CSV</button>
            </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Client</th>
                    <th>Statut</th>
                    <th>Pack</th>
                    <th>Prix</th>
                    <th>Date</th>
                    <th style={{ width: 160 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((f) => (
                  <tr
                    key={f.id}
                    className={`clickable ${selectedFile?.id === f.id ? 'selected' : ''}`}
                    onClick={() => setSelectedFile(f)}
                    style={{ cursor: "pointer" }}
                    >
                    <td>{f.title || "—"}</td>
                    <td>{clientsById[f.clientId]?.company || clientsById[f.clientId]?.name || f.clientId || "—"}</td>
                    <td><span className={`badge-status ${f.status || 'en_cours'}`}>{f.status || "en_cours"}</span></td>
                  <td>{packLabel(f)}</td>
                  <td>{packPrice(f)}</td>
                  <td>{formatDate(f.createdAt)}</td>
                    <td>
                    <div className="actions" onClick={(e) => e.stopPropagation()}>
                        <button className="btn-icon view" title="Voir le dossier" aria-label="Voir" onClick={() => { setSelectedFile(f); setPreviewFile(f); }}><EyeIcon /> Voir</button>
                        <button
                          className="btn-icon edit"
                          title="Éditer"
                          aria-label="Éditer"
                          onClick={() => {
                            setSelectedFile(f);
                            setFileForm({
                              title: f.title || "",
                              clientId: f.clientId || "",
                              packCode: f.packCode || PACK_OPTIONS[0].code,
                              packLabel: f.packLabel || f.pack || PACK_OPTIONS[0].label,
                              packPrice: f.packPrice ?? f.price ?? PACK_OPTIONS[0].price,
                              price: f.packPrice ?? f.price ?? "",
                              status: f.status || "en_cours",
                              address: f.address || "",
                              power: f.power || "",
                              mairieDepositDate: f.mairieDepositDate || "",
                              consuelVisitDate: f.consuelVisitDate || "",
                              enedisPdL: f.enedisPdL || "",
                              edfContractNumber: f.edfContractNumber || "",
                              notes: f.notes || "",
                            });
                            setEditingFileId(f.id);
                          }}
                        >
                          <EditIcon /> Éditer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="filters" style={{ justifyContent: "space-between" }}>
              <button disabled={filePage === 0} onClick={() => setFilePage((p) => Math.max(0, p - 1))}>Précédent</button>
              <span>Page {filePage + 1}</span>
                <button className="btn-secondary" disabled={(filePage + 1) * filePageSize >= filesTotal} onClick={() => setFilePage((p) => p + 1)}>Suivant</button>
            </div>
          </div>
          <FileDetail file={selectedFile} attachments={attachments} setAttachments={setAttachments} clientsById={clientsById} />
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <h3>Créer un dossier</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (fileForm.clientId) {
                const exists = (files || []).some((f) => f.clientId === fileForm.clientId && f.id !== editingFileId && !["finalise", "clos"].includes((f.status || "").toLowerCase()));
                if (exists) {
                  alert("Un dossier existe déjà pour ce client.");
                  return;
                }
              }
              setCreating(true);
              try {
            const res = await fetch(`${API_BASE}/files`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Api-Token": API_TOKEN },
              body: JSON.stringify({ ...fileForm, id: editingFileId || undefined, pack: fileForm.packCode }),
            });
            const body = await res.json();
            if (!res.ok) {
              if (body?.error === "file_exists") throw new Error("Un dossier existe déjà pour ce client.");
              throw new Error(body?.error || res.statusText);
            }
            setFileForm({ title: "", clientId: "", packCode: PACK_OPTIONS[0].code, packLabel: PACK_OPTIONS[0].label, packPrice: PACK_OPTIONS[0].price, status: "en_cours", address: "", power: "", mairieDepositDate: "", consuelVisitDate: "", enedisPdL: "", edfContractNumber: "" });
            setEditingFileId(null);
            setReloadKey((k) => k + 1);
          } catch (err) {
            alert(`Erreur dossier: ${err.message}`);
          } finally {
            setCreating(false);
          }
        }} className="two-cols" id="file-form">
              <input required placeholder="Titre dossier" value={fileForm.title} onChange={(e) => setFileForm({ ...fileForm, title: e.target.value })} />
              <input placeholder="Client ID" value={fileForm.clientId} onChange={(e) => setFileForm({ ...fileForm, clientId: e.target.value })} />
              <select value={fileForm.packCode} onChange={(e) => {
                const sel = PACK_OPTIONS.find((p) => p.code === e.target.value) || PACK_OPTIONS[0];
                setFileForm({ ...fileForm, packCode: sel.code, packLabel: sel.label, packPrice: sel.price });
              }}>
                {PACK_OPTIONS.map((p) => (
                  <option key={p.code} value={p.code}>{p.label}</option>
                ))}
              </select>
              <select value={fileForm.status} onChange={(e) => setFileForm({ ...fileForm, status: e.target.value })}>
                <option value="en_cours">En cours</option>
                <option value="bloque">Bloqué</option>
                <option value="finalise">Finalisé</option>
              </select>
              <input placeholder="Prix €" value={fileForm.packPrice ?? fileForm.price ?? ''} onChange={(e) => setFileForm({ ...fileForm, packPrice: e.target.value })} />
              <input placeholder="Adresse" value={fileForm.address} onChange={(e) => setFileForm({ ...fileForm, address: e.target.value })} />
              <input placeholder="Puissance kWc" value={fileForm.power} onChange={(e) => setFileForm({ ...fileForm, power: e.target.value })} />
              <input placeholder="Date dépôt mairie" value={fileForm.mairieDepositDate || ''} onChange={(e) => setFileForm({ ...fileForm, mairieDepositDate: e.target.value })} />
              <input placeholder="Date visite Consuel" value={fileForm.consuelVisitDate || ''} onChange={(e) => setFileForm({ ...fileForm, consuelVisitDate: e.target.value })} />
              <input placeholder="N° PDL/PRM Enedis" value={fileForm.enedisPdL || ''} onChange={(e) => setFileForm({ ...fileForm, enedisPdL: e.target.value })} />
              <input placeholder="N° contrat EDF OA" value={fileForm.edfContractNumber || ''} onChange={(e) => setFileForm({ ...fileForm, edfContractNumber: e.target.value })} />
              <button type="submit" disabled={creating} className="btn-primary" style={{ gridColumn: "1 / -1" }}>
                {creating ? "Création..." : "Créer le dossier"}
              </button>
            </form>
          </div>
        </div>
      )}
      {tab === 'files' && (
        <button
          className="fab"
          onClick={() => {
            const form = document.getElementById("file-form");
            if (form) form.scrollIntoView({ behavior: "smooth" });
          }}
          aria-label="Nouveau dossier"
          title="Nouveau dossier"
        >
          +
        </button>
      )}

      {previewClient && (
        <div className="modal-backdrop" onClick={() => setPreviewClient(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="pill soft">Client</div>
                  <h3 style={{ margin: "6px 0 0" }}>{previewClient.name || "Sans nom"}</h3>
                  <div className="small">{previewClient.company || "—"}</div>
                  <div className="small">{previewClient.email || "—"} · {previewClient.phone || "—"}</div>
                </div>
                <button className="btn-icon" onClick={() => setPreviewClient(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="info-cards">
                <div className="info-chip">
                  <div className="mini-label">Pack</div>
                  <div className="mini-value">{packLabel(previewClient)}</div>
                </div>
                <div className="info-chip">
                  <div className="mini-label">Segment</div>
                  <div className="mini-value">{previewClient.segment || "small"}</div>
                </div>
                <div className="info-chip">
                  <div className="mini-label">Statut</div>
                  <div className="mini-value">{previewClient.status || "actif"}</div>
                </div>
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn-primary" onClick={() => { createFileForClient(previewClient); setPreviewClient(null); }}>Créer un dossier</button>
                <button className="btn-secondary" onClick={() => setPreviewClient(null)}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {previewFile && (
        <div className="modal-backdrop" onClick={() => setPreviewFile(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="pill soft">Dossier</div>
                  <h3 style={{ margin: "6px 0 0" }}>{previewFile.title || "Sans titre"}</h3>
                  <div className="small">
                  Client : {clientsById[previewFile.clientId]?.company || clientsById[previewFile.clientId]?.name || previewFile.clientId || "—"} • Pack : {packLabel(previewFile)}
                  </div>
                </div>
                <button className="btn-icon" onClick={() => setPreviewFile(null)}>✕</button>
              </div>
              <div className="modal-body">
              <div className="info-cards">
                <div className="info-chip">
                  <div className="mini-label">Statut</div>
                  <div className="mini-value">{previewFile.status || "en_cours"}</div>
                </div>
                <div className="info-chip">
                  <div className="mini-label">Prix</div>
                  <div className="mini-value">{packPrice(previewFile)}</div>
                </div>
                <div className="info-chip">
                  <div className="mini-label">Puissance</div>
                  <div className="mini-value">{previewFile.power || "—"}</div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div className="small">Adresse : {previewFile.address || "—"}</div>
                <div className="small" style={{ marginTop: 4 }}>Consuel : {previewFile.consuelStatus || "—"} • Enedis : {previewFile.enedisStatus || "—"} • EDF OA : {previewFile.edfStatus || "—"}</div>
              </div>
              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn-primary" onClick={() => { setSelectedFile(previewFile); setPreviewFile(null); }}>Ouvrir la fiche</button>
                <button className="btn-secondary" onClick={() => setPreviewFile(null)}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
