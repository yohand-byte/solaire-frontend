import { useEffect, useState } from 'react';
import { getClaims } from '../auth/claims';
import { useAuth } from './useAuth';

export function useClaims() {
  const { user, loading: authLoading } = useAuth();
  const [claims, setClaims] = useState<{ role?: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!user) {
        if (mounted) {
          setClaims(null);
          setLoading(false);
        }
        return;
      }
      try {
        const c = await getClaims(user);
        if (mounted) setClaims(c);
      } catch (e) {
        if (mounted) setClaims(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (!authLoading) load();
    return () => {
      mounted = false;
    };
  }, [user, authLoading]);

  return { claims, loading: loading || authLoading };
}
