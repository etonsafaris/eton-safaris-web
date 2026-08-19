'use client';

import { useMemo, useState } from 'react';

export default function MathCaptcha({
  onValidChange,
}: {
  onValidChange: (valid: boolean) => void;
}) {
  const challenge = useMemo(() => {
    const left = 1 + Math.floor(Math.random() * 9);
    const right = 1 + Math.floor(Math.random() * 9);
    return { left, right, sum: left + right };
  }, []);
  const [answer, setAnswer] = useState('');

  return (
    <label className="block text-sm font-medium text-gray-700">
      Security check: what is {challenge.left} + {challenge.right}?
      <input
        required
        inputMode="numeric"
        autoComplete="off"
        value={answer}
        onChange={(event) => {
          const next = event.target.value;
          setAnswer(next);
          onValidChange(Number.parseInt(next, 10) === challenge.sum);
        }}
        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-moss"
      />
    </label>
  );
}
