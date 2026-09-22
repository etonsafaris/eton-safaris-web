/** One in-flight admin DB API call per browser tab — avoids bursting Aiven connection limit. */
let tail: Promise<unknown> = Promise.resolve();

export function serialAdminApi<T>(work: () => Promise<T>): Promise<T> {
  const job = tail.then(() => work());
  tail = job.then(
    () => undefined,
    () => undefined
  );
  return job;
}
