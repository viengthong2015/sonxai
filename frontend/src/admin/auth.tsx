import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, ApiError, setUnauthorizedHandler } from '../lib/api';
import type { User } from '../lib/types';
import { FullPageSpinner } from '../public/PublicLayout';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await api.get<User>('/auth/me');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** Clears the session in the cache whenever an admin call returns 401 (e.g. expired session). */
export function SessionWatcher() {
  const qc = useQueryClient();
  useEffect(() => {
    setUnauthorizedHandler(() => {
      qc.setQueryData<User | null>(['me'], null);
    });
    return () => setUnauthorizedHandler(null);
  }, [qc]);
  return null;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) return <FullPageSpinner />;
  if (!me.data) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
