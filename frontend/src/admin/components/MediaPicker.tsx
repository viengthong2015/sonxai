import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { useToast } from '../../lib/toast';
import type { MediaItem } from '../../lib/types';
import { isSafeUrl } from '../../lib/url';
import { useAT } from '../i18n';
import { LoadingBlock, Modal, Spinner, useConfirm } from './ui';

const ACCEPT = 'image/png,image/jpeg,image/gif,image/webp';

function useUpload() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.upload<MediaItem>('/admin/media', fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media'] }),
    onError: (e) => toast(errorMessage(e), 'error'),
  });
}

function MediaLibrary({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (url: string) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const at = useAT();
  const upload = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const q = useQuery({ queryKey: ['media'], queryFn: () => api.get<MediaItem[]>('/admin/media'), enabled: open });

  const remove = useMutation({
    mutationFn: (id: number) => api.del(`/admin/media/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media'] });
      toast(at('Image deleted'));
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={at('Media library')}
      size="xl"
      footer={
        <>
          <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
          <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Spinner className="w-4 h-4" /> : <i className="fa-solid fa-upload" />} {at('Upload image')}
          </button>
        </>
      }
    >
      {q.isPending ? (
        <LoadingBlock />
      ) : !q.data?.length ? (
        <p className="text-sm text-slate-500 text-center py-10">{at('No images yet. Upload PNG, JPEG, GIF or WebP files.')}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {q.data.map((m) => (
            <div key={m.id} className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
              <button type="button" onClick={() => onSelect(m.url)} className="block w-full aspect-square">
                <img src={m.url} alt={m.original_name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </button>
              <div className="px-2 py-1.5 text-[11px] text-slate-500 truncate bg-white border-t border-slate-100" title={m.original_name}>
                {m.original_name || at('image')} · {Math.round(m.size / 1024)} KB
              </div>
              <button
                type="button"
                aria-label={at('Delete image')}
                onClick={async () => {
                  if (await confirm({ title: at('Delete image?'), message: at('Pages that use this image will show a broken image.'), confirmLabel: at('Delete'), danger: true }))
                    remove.mutate(m.id);
                }}
                className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/90 text-rose-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition shadow"
              >
                <i className="fa-solid fa-trash text-xs" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export function ImageField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [libOpen, setLibOpen] = useState(false);
  const upload = useUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const at = useAT();

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="w-full sm:w-32 h-24 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
        {isSafeUrl(value) && value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <i className="fa-regular fa-image text-2xl text-slate-300" />}
      </div>
      <div className="flex-1 space-y-2">
        <input className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="/uploads/… or https://…" />
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload.mutate(f, { onSuccess: (m) => onChange(m.url) });
              e.target.value = '';
            }}
          />
          <button type="button" className="btn-secondary !py-1.5 !text-xs" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Spinner className="w-3 h-3" /> : <i className="fa-solid fa-upload" />} {at('Upload')}
          </button>
          <button type="button" className="btn-secondary !py-1.5 !text-xs" onClick={() => setLibOpen(true)}>
            <i className="fa-regular fa-images" /> {at('Library')}
          </button>
          {value && (
            <button type="button" className="btn-ghost !py-1.5 !text-xs text-rose-600" onClick={() => onChange('')}>
              <i className="fa-solid fa-xmark" /> {at('Remove')}
            </button>
          )}
        </div>
      </div>
      <MediaLibrary
        open={libOpen}
        onClose={() => setLibOpen(false)}
        onSelect={(url) => {
          onChange(url);
          setLibOpen(false);
        }}
      />
    </div>
  );
}
