'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User, type Auth } from 'firebase/auth';
import { useAuth } from '@/firebase/provider';

interface UseUser {
  user: User | null;
  loading: boolean;
  auth: Auth | null;
}

export function useUser(): UseUser {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return { user, loading, auth };
}
