import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { useToast } from '../lib/toast';
import type { BlockData, Lang } from '../lib/types';
import { SETTINGS_GROUPS } from './blockSchemas';
import { ErrorBlock, LangSwitch, LoadingBlock, PageTitle, Spinner } from './components/ui';
import { FieldsForm } from './fields';
import { useInvalidateDraft } from './publish';
import { TranslatingBanner } from './TranslatingBanner';
import { fillTranslations, useMachineTranslation } from './autoTranslate';
import { useAT } from './i18n';
import { SOURCE_LANG } from '../lib/i18n';

export function SettingsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const invalidate = useInvalidateDraft();
  const q = useQuery({ queryKey: ['settings'], queryFn: () => api.get<BlockData>('/admin/settings') });
  const [draft, setDraft] = useState<BlockData | null>(null);
  const [searchParams] = useSearchParams();
  const [lang, setLang] = useState<Lang>(searchParams.get('lang') || 'en');
  const at = useAT();
  const mt = useMachineTranslation();
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (q.data) setDraft(q.data);
  }, [q.data]);

  const dirty = !!draft && !!q.data && JSON.stringify(draft) !== JSON.stringify(q.data);

  const save = useMutation({
    mutationFn: (data: BlockData) => api.put<BlockData>('/admin/settings', data),
    onSuccess: (data) => {
      qc.setQueryData(['settings'], data);
      invalidate();
      toast(at('Settings saved. Publish to apply them to the live site.'));
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const autoTranslate = async () => {
    if (!draft) return;
    setTranslating(true);
    try {
      const { languages, ui_strings, ...rest } = draft;
      const { result, count } = await fillTranslations(rest, lang);
      setDraft({ ...result, languages, ui_strings });
      toast(count ? at('{n} texts translated. Check them, then save.', { n: count }) : at('Nothing to translate: every text already has a translation.'));
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setTranslating(false);
    }
  };

  if (q.isPending || !draft) return q.isError ? <ErrorBlock message={errorMessage(q.error)} onRetry={() => q.refetch()} /> : <LoadingBlock />;

  return (
    <>
      <PageTitle
        title={at('Site settings')}
        subtitle={at('School name, header, footer, contact details and the application form.')}
        actions={
          <>
            <LangSwitch lang={lang} onChange={setLang} />
            <button className="btn-ghost" disabled={!dirty} onClick={() => setDraft(q.data!)}>{at('Discard')}</button>
            <button className="btn-primary" disabled={!dirty || save.isPending} onClick={() => save.mutate(draft)}>
              {save.isPending ? <Spinner className="w-4 h-4" /> : <i className="fa-solid fa-floppy-disk" />} {at('Save settings')}
            </button>
          </>
        }
      />
      <TranslatingBanner lang={lang}>
        {mt.available && lang !== SOURCE_LANG && (
          <button className="btn-secondary !py-1.5 !text-xs shrink-0" disabled={translating} onClick={autoTranslate}>
            {translating ? <Spinner className="w-3.5 h-3.5" /> : <i className="fa-solid fa-wand-magic-sparkles" />} {at('Auto-translate empty fields')}
          </button>
        )}
      </TranslatingBanner>
      <div className="space-y-6">
        {SETTINGS_GROUPS.map((g) => (
          <section key={g.title} className="card p-5 sm:p-6">
            <h2 className="font-bold text-slate-900">{at(g.title)}</h2>
            {g.description && <p className="text-sm text-slate-500 mt-0.5">{at(g.description)}</p>}
            <div className="mt-5">
              <FieldsForm fields={g.fields} value={draft} onChange={setDraft} lang={lang} />
            </div>
          </section>
        ))}
      </div>
      {dirty && (
        <div className="sticky bottom-4 mt-6 flex justify-end">
          <div className="card shadow-xl px-4 py-3 flex items-center gap-3">
            <span className="text-sm text-slate-600">{at('You have unsaved changes')}</span>
            <button className="btn-primary" disabled={save.isPending} onClick={() => save.mutate(draft)}>
              {save.isPending && <Spinner className="w-4 h-4" />} {at('Save')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
