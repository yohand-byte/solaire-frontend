import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firestore";

export function useDocument(path: string, id: string) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    const ref = doc(db, path, id);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      (err) => {
        console.error("useDocument error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [path, id]);

  return { data, loading, error };
}