import { useState, useEffect } from "react";

type AdminKeyPanelProps = {
  onChange?: (value: string) => void;
};

export function AdminKeyPanel({ onChange }: AdminKeyPanelProps) {
  const [key, setKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("ADMIN_API_KEY") || "";
    setKey(stored);
  }, []);

  const save = () => {
    const next = key.trim();
    sessionStorage.setItem("ADMIN_API_KEY", next);
    setMessage("Clé admin enregistrée.");
    if (onChange) onChange(next);
  };

  const clear = () => {
    sessionStorage.removeItem("ADMIN_API_KEY");
    setKey("");
    setMessage("Clé admin supprimée.");
    if (onChange) onChange("");
  };

  return (
    <div className="card" style={{ marginBottom: 16, padding: 16, border: "1px solid #30363d" }}>
      <h4 style={{ marginBottom: 8 }}>Clé admin</h4>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="X-ADMIN-KEY"
          style={{ flex: 1 }}
        />
        <button className="btn-primary" onClick={save}>Enregistrer</button>
        <button className="btn-secondary" onClick={clear}>Oublier</button>
      </div>
      {message && <div style={{ marginTop: 8, color: "#22c55e" }}>{message}</div>}
    </div>
  );
}
