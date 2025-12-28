import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";

const API_BASE = "https://solaire-api-828508661560.europe-west1.run.app";
const API_TOKEN = "saftoken-123";

const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "X-Api-Token": API_TOKEN,
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.error || body?.message || `Erreur API (${res.status})`;
    throw new Error(message);
  }
  return body;
};

const formatDate = (value: any) => {
  if (!value) return "-";
  const date = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("fr-FR");
};

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const loadLeads = useCallback(async () => {
    const data = await apiFetch("/api/leads?limit=200");
    setLeads(Array.isArray(data) ? data : data.items || []);
  }, []);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        setLoading(true);
        await loadLeads();
      } catch (err: any) {
        if (active) setError(err?.message || "Erreur lors du chargement");
      } finally {
        if (active) setLoading(false);
      }
    };
    bootstrap();
    return () => { active = false; };
  }, [loadLeads]);

  const lead = useMemo(() => leads.find((item) => item.id === id), [leads, id]);

  const handleConvert = async () => {
    if (!lead) return;
    setConverting(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/api/leads/${lead.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setMessage("Lead converti en projet.");
    } catch (err: any) {
      setError(err?.message || "Conversion impossible");
    } finally {
      setConverting(false);
    }
  };

  const handleUndo = async () => {
    if (!lead) return;
    if (!confirm("Annuler la conversion ?")) return;
    setUndoing(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/api/leads/${lead.id}/undo-convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await loadLeads();
      setMessage("Conversion annulee.");
    } catch (err: any) {
      const msg = err?.message || "Annulation impossible";
      setError(msg);
    } finally {
      setUndoing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Chargement du lead...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Lead introuvable</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-gray-500">{lead.company || "Lead"}</p>
            <h1 className="text-2xl font-bold text-gray-900">
              {lead.contact?.firstName || lead.firstName || "-"} {lead.contact?.lastName || lead.lastName || ""}
            </h1>
            <p className="text-sm text-gray-500">
              {lead.contact?.email || lead.email || "-"} - {lead.contact?.phone || lead.phone || "-"}
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            {lead.status || "new"}
          </span>
        </div>

        {message && (
          <div className="bg-emerald-50 text-emerald-600 text-sm px-4 py-3 rounded-xl border border-emerald-100">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Informations</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p className="text-xs uppercase text-gray-400">Entreprise</p>
                <p className="font-semibold text-gray-900">{lead.company || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400">Pack</p>
                <p className="font-semibold text-gray-900">{lead.pack || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400">Source</p>
                <p className="font-semibold text-gray-900">{lead.source || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400">Cree le</p>
                <p className="font-semibold text-gray-900">{formatDate(lead.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400">Converti le</p>
                <p className="font-semibold text-gray-900">{lead.convertedAt ? formatDate(lead.convertedAt) : "-"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
            <p className="text-sm text-gray-500">Convertir ce lead en projet.</p>
            {lead.status === "converted" ? (
              <button
                onClick={handleUndo}
                disabled={undoing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white shadow-sm disabled:opacity-50"
              >
                {undoing ? "Annulation..." : "Annuler conversion"}
              </button>
            ) : (
              <button
                onClick={handleConvert}
                disabled={converting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-white shadow-sm disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {converting ? "Conversion..." : "Convertir en projet"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
