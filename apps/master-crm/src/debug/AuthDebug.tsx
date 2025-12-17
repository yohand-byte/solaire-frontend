import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { app } from "../lib/firestore";

export function AuthDebug() {
  const { user, claims } = useAuth();
  const [path, setPath] = useState("");
  const [queryAllowed, setQueryAllowed] = useState(false);

  useEffect(() => {
    setPath(window.location.pathname + window.location.search);
    const params = new URLSearchParams(window.location.search);
    setQueryAllowed(params.get("debug") === "1" || import.meta.env.DEV);
  }, []);

  if (!queryAllowed) {
    return <div style={{ padding: 20 }}><strong>Debug désactivé.</strong> Ajoutez ?debug=1 pour afficher les infos.</div>;
  }

  return (
    <div style={{ padding: 20, fontFamily: "Inter, sans-serif" }}>
      <h3>Debug Auth</h3>
      <pre style={{ background: "#0d1117", color: "#e5e7eb", padding: 12, borderRadius: 8 }}>
        {JSON.stringify({
          firebaseProjectId: app.options.projectId,
          uid: user?.uid || null,
          role: claims?.role || null,
          path,
        }, null, 2)}
      </pre>
    </div>
  );
}
