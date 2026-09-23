/** One in-flight PostgreSQL operation per Node process (critical on serverless + Aiven ~20 conn). */
let tail: Promise<unknown> = Promise.resolve();

export function serialPgWork<T>(work: () => Promise<T>): Promise<T> {
  const job = tail.then(() => work());
  tail = job.then(
    () => undefined,
    () => undefined
  );
  return job;
}
