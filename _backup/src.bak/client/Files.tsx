import { useEffect, useState } from "react";
import { PACKS } from "../constants";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { API_URL } from "../api/client";

const API_BASE = API_URL;

type FileItem = {
  id: string;
  reference?: string;
  ref?: string;
  clientId?: string;
  clientFinal?: string;
  pack?: string;
  statutGlobal?: string;
  status?: string;
  address?: string;
};

export default function ClientFiles() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/files?limit=200`);
        if (!res.ok) throw new Error(`API ${res.status}`);
        const json = await res.json();
        const items = (json.items || json || []) as FileItem[];
        const filtered = user?.uid
          ? items.filter((f) => f.clientId === user.uid)
          : items;
        if (active) setFiles(filtered);
      } catch (e: any) {
        if (active) setError(e.message || "Erreur de chargement");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  if (loading) return <div className="card">Chargement…</div>;
  if (error) return <div className="card error">Erreur: {error}</div>;

  return (
    <div className="card">
      <h3>Mes dossiers</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Réf</th>
            <th>Adresse</th>
            <th>Pack</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <tr key={f.id}>
              <td>
                <Link to={`/client/dossiers/${f.id}`}>
                  {f.reference || f.ref || f.id}
                </Link>
              </td>
              <td>{f.address || "—"}</td>
              <td>{PACKS.find((p) => p.value === f.pack)?.label || f.pack || "—"}</td>
              <td>
                <span className={`badge-status ${f.statutGlobal || f.status || "en_cours"}`}>
                  {f.statutGlobal || f.status || "en_cours"}
                </span>
              </td>
            </tr>
          ))}
          {files.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: "center" }}>
                Aucun dossier pour ce compte.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
