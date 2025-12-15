import { useEffect, useState } from "react";
import { db } from "../lib/firestore";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "./useAuth";

export function useCollection(path: string, whereClause?: [string, string, any]) {
  const { user, claims, role, loading: authLoading } = useAuth();
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }
    const colRef = collection(db, path);
    let q: any = colRef;
    if (role === "client") {
      const installerId = claims?.installerId || "INST123";
      q = query(colRef, where("installerId", "==", installerId));
    } else if (whereClause) {
      q = query(colRef, where(whereClause[0], whereClause[1], whereClause[2]));
    }
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [path, authLoading, user, role, claims?.installerId]);

  return { data, loading, error };
}
