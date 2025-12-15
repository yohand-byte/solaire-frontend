import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firestore";
import { useAuth } from "./useAuth";

export function useCollection(path: string) {
  const { installerId, role, loading: authLoading } = useAuth();
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (authLoading) return;

    const colRef = collection(db, path);
    const q =
      role === "client" && installerId
        ? query(colRef, where("installerId", "==", installerId))
        : colRef;

    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("useCollection error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [path, installerId, role, authLoading]);

  return { data, loading, error };
}