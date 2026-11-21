import { useLang } from '../../lib/i18n';
import type { BlockData } from '../../lib/types';
import { ApplicationForm } from '../ApplicationForm';

export function EnrollmentForm({ data }: { data: BlockData }) {
  const { t } = useLang();
  return (
    <section className="py-16 lg:py-24 bg-mist">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5">
          <h2 className="text-3xl sm:text-[2.5rem] leading-[1.2] text-ink">{t(data.title)}</h2>
          {t(data.subtitle) && <p className="mt-4 text-lg text-ink-soft">{t(data.subtitle)}</p>}
        </div>
        <div className="lg:col-span-7 bg-white border border-rule rounded-2xl p-6 sm:p-9 border-t-[6px] border-t-lapis-700">
          <ApplicationForm />
        </div>
      </div>
    </section>
  );
}
