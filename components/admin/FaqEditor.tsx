'use client';

import { useState } from 'react';
import type { PageFaq } from '@/lib/cms-page-model';

export default function FaqEditor({
  faqs,
  onChange,
  title = 'FAQ',
  description = 'Appears on the public page and is added to FAQ structured data for ranking.',
}: {
  faqs: PageFaq[];
  onChange: (faqs: PageFaq[]) => void;
  title?: string;
  description?: string;
}) {
  const [draft, setDraft] = useState<PageFaq>({ question: '', answer: '' });

  function addFaq() {
    const question = draft.question.trim();
    const answer = draft.answer.trim();
    if (!question || !answer) return;
    onChange([...faqs, { question, answer }]);
    setDraft({ question: '', answer: '' });
  }

  return (
    <section className="mt-8 rounded-2xl border border-[#e5e7eb] bg-white p-6">
      <h2 className="font-serif text-2xl font-bold text-[#111827]">{title}</h2>
      <p className="mt-1 text-sm text-[#6b7280]">{description}</p>

      {faqs.length > 0 ? (
        <div className="mt-4 space-y-3">
          {faqs.map((faq, index) => (
            <div key={`${faq.question}-${index}`} className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#111827]">{faq.question}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#6b7280]">{faq.answer}</p>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-xs font-semibold text-red-600"
                  onClick={() => onChange(faqs.filter((_, itemIndex) => itemIndex !== index))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <input
          value={draft.question}
          onChange={(event) => setDraft({ ...draft, question: event.target.value })}
          placeholder="Question"
          className="w-full rounded-full border border-[#e5e7eb] bg-white px-5 py-3 text-sm text-[#111827] outline-none transition focus:border-[#66bb9a] focus:ring-2 focus:ring-[#66bb9a]/20"
        />
        <input
          value={draft.answer}
          onChange={(event) => setDraft({ ...draft, answer: event.target.value })}
          placeholder="Answer"
          className="w-full rounded-full border border-[#e5e7eb] bg-white px-5 py-3 text-sm text-[#111827] outline-none transition focus:border-[#66bb9a] focus:ring-2 focus:ring-[#66bb9a]/20"
        />
      </div>
      <button
        type="button"
        onClick={addFaq}
        className="mt-4 rounded-full bg-[#00A651] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#059669]"
      >
        Add FAQ
      </button>
    </section>
  );
}
