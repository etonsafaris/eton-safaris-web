'use client';

import { useState } from 'react';
import type { PageFaq } from '@/lib/cms-page-model';

export default function FaqEditor({
  faqs,
  onChange,
  title = 'FAQ',
  description = 'Appears under the description on the public page. You can add new questions and edit saved ones here.',
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

  function updateFaq(index: number, patch: Partial<PageFaq>) {
    onChange(
      faqs.map((faq, itemIndex) =>
        itemIndex === index
          ? {
              question: patch.question !== undefined ? patch.question : faq.question,
              answer: patch.answer !== undefined ? patch.answer : faq.answer,
            }
          : faq
      )
    );
  }

  return (
    <section className="border-t-4 border-[#00A651] bg-[#ecfdf5] px-5 py-3">
      <h2 className="font-serif text-xl font-bold text-[#111827]">{title}</h2>
      <p className="mt-0.5 text-xs text-[#166534]">{description}</p>

      <div className="mt-3 space-y-3">
        {faqs.map((faq, index) => (
          <div key={`faq-${index}`} className="rounded-2xl border border-[#86efac] bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#00A651]">Question {index + 1}</p>
              <button
                type="button"
                className="text-xs font-semibold text-red-600"
                onClick={() => onChange(faqs.filter((_, itemIndex) => itemIndex !== index))}
              >
                Remove
              </button>
            </div>
            <input
              value={faq.question}
              onChange={(event) => updateFaq(index, { question: event.target.value })}
              placeholder="Question"
              className="w-full rounded-full border border-[#e5e7eb] bg-white px-5 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20"
            />
            <textarea
              value={faq.answer}
              onChange={(event) => updateFaq(index, { answer: event.target.value })}
              placeholder="Answer"
              rows={2}
              className="mt-2 w-full resize-y rounded-2xl border border-[#e5e7eb] bg-white px-5 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/20"
            />
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-dashed border-[#00A651] bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#00A651]">Add a new question</p>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={draft.question}
            onChange={(event) => setDraft({ ...draft, question: event.target.value })}
            placeholder="Question"
            className="w-full rounded-full border-0 bg-[#f3f4f6] px-5 py-3 text-sm text-[#111827] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#00A651]/20"
          />
          <input
            value={draft.answer}
            onChange={(event) => setDraft({ ...draft, answer: event.target.value })}
            placeholder="Answer"
            className="w-full rounded-full border-0 bg-[#f3f4f6] px-5 py-3 text-sm text-[#111827] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#00A651]/20"
          />
        </div>
        <button
          type="button"
          onClick={addFaq}
          className="mt-3 rounded-full bg-[#00A651] px-5 py-2 text-sm font-semibold text-white hover:bg-[#059669]"
        >
          Add FAQ
        </button>
      </div>
    </section>
  );
}
