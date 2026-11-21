import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage } from '../lib/api';
import { useToast } from '../lib/toast';
import type { User } from '../lib/types';
import { useMe } from './auth';
import { Badge, ErrorBlock, LoadingBlock, Modal, PageTitle, Spinner, Toggle, timeAgo, useConfirm } from './components/ui';

function UserModal({ open, onClose, user }: { open: boolean; onClose: () => void; user: User | null }) {
  const qc = useQueryClient();
  const toast = useToast();
  const me = useMe();
  const [form, setForm] = useState({ username: '', full_name: '', password: '', is_active: true });
  const [error, setError] = useState<string | null>(null);
  const isSelf = user?.id === me.data?.id;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({ username: user?.username ?? '', full_name: user?.full_name ?? '', password: '', is_active: user?.is_active ?? true });
  }, [open, user]);

  const save = useMutation({
    mutationFn: () =>
      user
        ? api.put<User>(`/admin/users/${user.id}`, { full_name: form.full_name, is_active: form.is_active, password: form.password || null })
        : api.post<User>('/admin/users', { username: form.username, full_name: form.full_name, password: form.password }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast(user ? 'Administrator updated' : 'Administrator created');
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    save.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title={user ? `Edit ${user.username}` : 'New administrator'} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Username</label>
          <input className="input" required minLength={3} maxLength={64} pattern="[A-Za-z0-9_.\-]+" disabled={!!user} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="off" />
        </div>
        <div>
          <label className="label">Full name</label>
          <input className="input" maxLength={120} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        {!isSelf && (
          <div>
            <label className="label">{user ? 'Reset password' : 'Password'}</label>
            <input type="password" className="input" required={!user} minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={user ? 'Leave empty to keep the current password' : 'At least 8 characters'} autoComplete="new-password" />
          </div>
        )}
        {user && !isSelf && <Toggle checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Account active (can sign in)" />}
        {isSelf && <p className="text-xs text-slate-500">To change your own password, use the account menu in the top-right corner.</p>}
        {error && <p className="text-sm text-rose-600 whitespace-pre-line">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={save.isPending}>{save.isPending && <Spinner className="w-4 h-4" />} Save</button>
        </div>
      </form>
    </Modal>
  );
}

export function UsersPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const me = useMe();
  const q = useQuery({ queryKey: ['users'], queryFn: () => api.get<User[]>('/admin/users') });
  const [editing, setEditing] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  const remove = useMutation({
    mutationFn: (id: number) => api.del(`/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast('Administrator removed');
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  return (
    <>
      <PageTitle
        title="Administrators"
        subtitle="People who can sign in and manage the website."
        actions={<button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><i className="fa-solid fa-user-plus" /> Add administrator</button>}
      />
      {q.isPending ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorBlock message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <div className="card divide-y divide-slate-100">
          {q.data.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3.5">
              <span className="w-10 h-10 rounded-full bg-lapis-700 text-white text-sm font-bold flex items-center justify-center shrink-0">
                {(u.full_name || u.username).slice(0, 1).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900">{u.full_name || u.username}</span>
                  <span className="text-sm text-slate-400">@{u.username}</span>
                  {u.id === me.data?.id && <Badge tone="green">You</Badge>}
                  {!u.is_active && <Badge tone="rose">Disabled</Badge>}
                </div>
                <div className="text-xs text-slate-400">Last sign-in {timeAgo(u.last_login_at)}</div>
              </div>
              <button className="icon-btn" aria-label="Edit" onClick={() => { setEditing(u); setOpen(true); }}><i className="fa-solid fa-pen" /></button>
              <button
                className="icon-btn hover:!text-rose-600"
                aria-label="Delete"
                disabled={u.id === me.data?.id}
                onClick={async () => {
                  if (await confirm({ title: `Remove ${u.username}?`, message: 'They will no longer be able to sign in.', confirmLabel: 'Remove', danger: true })) remove.mutate(u.id);
                }}
              >
                <i className="fa-solid fa-trash" />
              </button>
            </div>
          ))}
        </div>
      )}
      <UserModal open={open} onClose={() => setOpen(false)} user={editing} />
    </>
  );
}
