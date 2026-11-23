import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import type { User } from '../lib/types';
import { useMe } from './auth';
import { Spinner } from './components/ui';
import { AdminLangPicker, useAT } from './i18n';

export function LoginPage() {
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const at = useAT();

  useEffect(() => {
    document.title = `${at('Sign in')} | Sonxai CMS`;
  }, [at]);

  const login = useMutation({
    mutationFn: () => api.post<User>('/auth/login', { username, password }),
    onSuccess: (user) => {
      qc.setQueryData(['me'], user);
      navigate(from && from.startsWith('/admin') && from !== '/admin/login' ? from : '/admin', { replace: true });
    },
    onError: () => setPassword(''),
  });

  if (me.data) return <Navigate to="/admin" replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate();
  };

  return (
    <div className="min-h-screen board relative overflow-hidden flex items-center justify-center p-4">

      <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 sm:p-8">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="Sonxai Primary School" className="w-20 h-20 object-contain mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-slate-900">{at('Sonxai Portal')}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{at('Sign in to manage the school website.')}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="username">{at('Username')}</label>
            <input
              id="username"
              type="text"
              required
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="password">{at('Password')}</label>
            <div className="relative">
              <input
                id="password"
                type={show ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label={show ? at('Hide password') : at('Show password')}>
                <i className={`fa-regular ${show ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
          </div>
          {login.isError && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5" role="alert">
              {errorMessage(login.error)}
            </p>
          )}
          <button type="submit" disabled={login.isPending} className="w-full py-3.5 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2">
            {login.isPending && <Spinner className="w-4 h-4" />} {at('Access Dashboard')}
          </button>
        </form>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="text-xs font-semibold text-brand-600 hover:underline">
            <i className="fa-solid fa-arrow-left mr-1" /> {at('Back to website')}
          </Link>
          <AdminLangPicker />
        </div>
      </div>
    </div>
  );
}
