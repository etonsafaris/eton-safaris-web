import type { PageFaq } from '@/lib/cms-page-model';
import { stripPublicMoney } from '@/lib/public-money';

export default function PageFaqList({
  faqs,
  tone = 'dark',
  className = '',
}: {
  faqs: PageFaq[];
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const shown = (faqs || [])
    .filter((faq) => faq?.question?.trim() && faq?.answer?.trim())
    .filter((faq, index, all) => {
      const key = faq.question.trim().toLowerCase();
      return all.findIndex((item) => item.question.trim().toLowerCase() === key) === index;
    })
    .slice(0, 4);
  if (!shown.length) return null;
  const dark = tone === 'dark';
  return (
    <section className={`mt-12 ${dark ? 'text-white' : 'text-[#222]'} ${className}`}>
      <h2 className={`font-serif text-2xl italic ${dark ? 'text-white' : 'text-[#343434]'}`}>
        Frequently asked questions
      </h2>
      <div className="mt-6 space-y-4">
        {shown.map((faq) => (
          <details
            key={faq.question}
            className={`rounded-xl border px-5 py-4 ${
              dark ? 'border-white/15 bg-white/5' : 'border-[#e5e7eb] bg-white'
            }`}
          >
            <summary className="cursor-pointer text-base font-semibold">{stripPublicMoney(faq.question)}</summary>
            <p className={`public-article-body mt-3 text-sm leading-relaxed ${dark ? 'text-white/75' : 'text-[#555]'}`}>
              {stripPublicMoney(faq.answer)}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
