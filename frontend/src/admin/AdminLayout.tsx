import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { useToast } from '../lib/toast';
import type { User } from '../lib/types';
import { useMe } from './auth';
import { ConfirmProvider, Modal, Spinner } from './components/ui';
import { AdminLangPicker, msg, useAT } from './i18n';
import { PublishButton } from './publish';

const NAV = [
  { to: '/admin', label: msg('Dashboard'), icon: 'fa-solid fa-gauge', end: true },
  { to: '/admin/menus', label: msg('Menus & Pages'), icon: 'fa-solid fa-bars-staggered' },
  { to: '/admin/applications', label: msg('Applications'), icon: 'fa-solid fa-inbox' },
  { to: '/admin/settings', label: msg('Site settings'), icon: 'fa-solid fa-sliders' },
  { to: '/admin/languages', label: msg('Languages'), icon: 'fa-solid fa-language' },
  { to: '/admin/publish', label: msg('Publish & history'), icon: 'fa-solid fa-clock-rotate-left' },
  { to: '/admin/users', label: msg('Administrators'), icon: 'fa-solid fa-user-shield' },
];

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const at = useAT();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => api.post<User>('/auth/change-password', { current_password: form.current_password, new_password: form.new_password }),
    onSuccess: (u) => {
      qc.setQueryData(['me'], u);
      toast(at('Password changed. Other sessions were signed out.'));
      setForm({ current_password: '', new_password: '', confirm: '' });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.new_password !== form.confirm) return setError(at('The new passwords do not match.'));
    m.mutate();
  };
  return (
    <Modal open={open} onClose={onClose} title={at('Change password')} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">{at('Current password')}</label>
          <input type="password" className="input" required autoComplete="current-password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} />
        </div>
        <div>
          <label className="label">{at('New password')}</label>
          <input type="password" className="input" required minLength={8} autoComplete="new-password" value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} />
          <p className="text-xs text-slate-400 mt-1">{at('At least 8 characters.')}</p>
        </div>
        <div>
          <label className="label">{at('Confirm new password')}</label>
          <input type="password" className="input" required autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </div>
        {error && <p className="text-sm text-rose-600 whitespace-pre-line">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>{at('Cancel')}</button>
          <button className="btn-primary" disabled={m.isPending}>{m.isPending && <Spinner className="w-4 h-4" />} {at('Save password')}</button>
        </div>
      </form>
    </Modal>
  );
}

function UserMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const at = useAT();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      qc.clear();
      qc.setQueryData(['me'], null);
      navigate('/admin/login', { replace: true });
    }
  };

  const initials = (user.full_name || user.username).split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100" aria-haspopup="menu" aria-expanded={open}>
        <span className="w-8 h-8 rounded-full bg-lapis-700 text-white text-xs font-bold flex items-center justify-center">{initials}</span>
        <span className="hidden md:block text-sm font-semibold text-slate-700 max-w-[140px] truncate">{user.full_name || user.username}</span>
        <i className="fa-solid fa-chevron-down text-[10px] text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white shadow-xl border border-slate-100 py-2 z-50" role="menu">
          <div className="px-4 py-2 border-b border-slate-100 mb-1">
            <div className="text-sm font-semibold text-slate-800 truncate">{user.full_name || user.username}</div>
            <div className="text-xs text-slate-400">@{user.username}</div>
          </div>
          <button role="menuitem" onClick={() => { setOpen(false); setPwOpen(true); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-brand-50 flex items-center gap-2.5">
            <i className="fa-solid fa-key w-4 text-slate-400" /> {at('Change password')}
          </button>
          <button role="menuitem" onClick={logout} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2.5">
            <i className="fa-solid fa-arrow-right-from-bracket w-4" /> {at('Sign out')}
          </button>
        </div>
      )}
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

export function AdminLayout() {
  const me = useMe();
  const [sideOpen, setSideOpen] = useState(false);
  const location = useLocation();
  const at = useAT();

  useEffect(() => setSideOpen(false), [location.pathname]);
  useEffect(() => {
    document.title = 'Admin | Sonxai CMS';
  }, []);

  if (!me.data) return null;

  return (
    <ConfirmProvider>
      <div className="min-h-screen bg-slate-50 lg:pl-64">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-brand-dark text-lapis-50 flex flex-col transition-transform lg:translate-x-0 ${sideOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10">
            <img src="/logo.png" alt="" className="w-10 h-10 object-contain" />
            <div className="leading-tight">
              <div className="font-extrabold text-white">Sonxai</div>
              <div className="text-xs text-lapis-200 font-medium">{at('Website editor')}</div>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${isActive ? 'bg-white/10 text-white' : 'text-lapis-100/75 hover:text-white hover:bg-white/5'}`
                }
              >
                <i className={`${n.icon} w-5 text-center`} /> {at(n.label)}
              </NavLink>
            ))}
          </nav>
          <div className="p-3 border-t border-white/10 space-y-1">
            <a href="/" target="_blank" rel="noopener" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-lapis-100/75 hover:text-white hover:bg-white/5">
              <i className="fa-solid fa-globe w-5 text-center" /> {at('View live site')}
            </a>
            <a href="/admin/preview" target="_blank" rel="noopener" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-lapis-100/75 hover:text-white hover:bg-white/5">
              <i className="fa-solid fa-eye w-5 text-center" /> {at('Preview draft')}
            </a>
          </div>
        </aside>
        {sideOpen && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setSideOpen(false)} />}

        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 glass-nav border-b border-slate-200/80 flex items-center gap-3 px-4 sm:px-6">
          <button className="lg:hidden icon-btn" onClick={() => setSideOpen(true)} aria-label={at('Open menu')}>
            <i className="fa-solid fa-bars" />
          </button>
          <Link to="/admin" className="lg:hidden font-extrabold text-slate-900">Sonxai CMS</Link>
          <div className="flex-1" />
          <AdminLangPicker className="hidden sm:inline-flex" />
          <PublishButton />
          <UserMenu user={me.data} />
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-6xl">
          <Outlet />
        </main>
      </div>
    </ConfirmProvider>
  );
}
