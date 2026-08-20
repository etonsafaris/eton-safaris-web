'use client';

import { useState } from 'react';
import type { PageFaq } from '@/lib/cms-page-model';

export default function FaqEditor({
  faqs,
  onChange,
  title = 'Frequently asked questions',
  description = 'These questions appear on the public page under the description you typed.',
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
    <section
      id="frequently-asked-questions"
      className="mt-8 scroll-mt-6 rounded-2xl border-2 border-[#00A651] bg-[#f0fdf4] p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00A651]">FAQ module</p>
          <h2 className="mt-1 font-serif text-2xl font-bold text-[#111827]">{title}</h2>
          <p className="mt-1 text-sm text-[#166534]">{description}</p>
        </div>
        <span className="rounded-full bg-[#00A651] px-3 py-1 text-xs font-semibold text-white">
          {faqs.length} added
        </span>
      </div>
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div key={`${faq.question}-${index}`} className="rounded-xl border border-[#bbf7d0] bg-white p-4">
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
        {faqs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#86efac] bg-white px-4 py-3 text-sm text-[#166534]">
            No questions yet. Type a question and answer below, then click Add FAQ.
          </p>
        ) : null}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <input
          value={draft.question}
          onChange={(event) => setDraft({ ...draft, question: event.target.value })}
          placeholder="Question"
          className="w-full rounded-full border border-[#bbf7d0] bg-white px-5 py-3 text-sm text-[#111827] outline-none transition focus:ring-2 focus:ring-[#00A651]/20"
        />
        <textarea
          value={draft.answer}
          onChange={(event) => setDraft({ ...draft, answer: event.target.value })}
          placeholder="Answer"
          rows={3}
          className="w-full resize-y rounded-xl border border-[#bbf7d0] bg-white px-5 py-3 text-sm text-[#111827] outline-none transition focus:ring-2 focus:ring-[#00A651]/20"
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
