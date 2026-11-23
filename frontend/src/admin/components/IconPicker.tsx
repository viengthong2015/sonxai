import { useEffect, useRef, useState } from 'react';
import { useAT } from '../i18n';

const ICONS = [
  'fa-solid fa-graduation-cap', 'fa-solid fa-school', 'fa-solid fa-book-open', 'fa-solid fa-book', 'fa-solid fa-book-open-reader',
  'fa-solid fa-pencil', 'fa-solid fa-palette', 'fa-solid fa-music', 'fa-solid fa-futbol', 'fa-solid fa-basketball',
  'fa-solid fa-person-running', 'fa-solid fa-flask', 'fa-solid fa-calculator', 'fa-solid fa-language', 'fa-solid fa-globe',
  'fa-solid fa-laptop', 'fa-solid fa-chalkboard-user', 'fa-solid fa-users', 'fa-solid fa-people-roof', 'fa-solid fa-child',
  'fa-solid fa-children', 'fa-solid fa-face-smile', 'fa-solid fa-heart', 'fa-solid fa-heart-pulse', 'fa-solid fa-seedling',
  'fa-solid fa-leaf', 'fa-solid fa-sun', 'fa-solid fa-star', 'fa-solid fa-trophy', 'fa-solid fa-award',
  'fa-solid fa-medal', 'fa-solid fa-shield-halved', 'fa-solid fa-lightbulb', 'fa-solid fa-puzzle-piece', 'fa-solid fa-bus',
  'fa-solid fa-utensils', 'fa-solid fa-calendar-days', 'fa-solid fa-clock', 'fa-solid fa-location-dot', 'fa-solid fa-phone',
  'fa-solid fa-envelope', 'fa-solid fa-handshake', 'fa-solid fa-building-columns', 'fa-solid fa-hand-holding-heart', 'fa-solid fa-camera',
  'fa-solid fa-newspaper', 'fa-solid fa-bullhorn', 'fa-solid fa-paper-plane',
];

export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const at = useAT();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-11 h-11 shrink-0 rounded-xl border border-slate-200 bg-brand-50 text-brand-700 text-lg flex items-center justify-center hover:border-brand-500"
          aria-label={at('Choose icon')}
        >
          {value ? <i className={value} /> : <i className="fa-regular fa-square text-slate-300" />}
        </button>
        <input className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value.replace(/[^a-z0-9\- ]/gi, ''))} placeholder="fa-solid fa-star" />
      </div>
      {open && (
        <div className="absolute z-30 mt-2 w-72 p-3 rounded-2xl bg-white shadow-xl border border-slate-200">
          <div className="grid grid-cols-8 gap-1">
            {ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                title={ic.replace('fa-solid fa-', '')}
                onClick={() => {
                  onChange(ic);
                  setOpen(false);
                }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${value === ic ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'}`}
              >
                <i className={ic} />
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {at('Any Font Awesome 6 free icon works, e.g.')} <code>fa-solid fa-bell</code>
          </p>
        </div>
      )}
    </div>
  );
}
