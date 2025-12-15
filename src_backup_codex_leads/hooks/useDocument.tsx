import { useEffect, useState } from "react";
import { db } from "../lib/firestore";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "./useAuth";

export function useDocument(path: string, id: string) {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user || !id) {
      setData(null);
      setLoading(false);
      return;
    }
    const docRef = doc(db, path, id);
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [path, id, authLoading, user]);

  return { data, loading, error };
}
