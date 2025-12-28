import { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { useAuth } from './useAuth.tsx';

export interface InstallerProfile {
  role?: string;
  status?: string;
  onboarded?: boolean;
  company?: string;
  phone?: string;
}

export function useUserProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<InstallerProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const db = getFirestore(getApp());
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (mounted) setProfile((snap.exists() ? snap.data() : {}) as InstallerProfile);
      } catch (e) {
        if (mounted) setProfile({});
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (!authLoading) load();
    return () => {
      mounted = false;
    };
  }, [user, authLoading]);

  return { profile, loading };
}
