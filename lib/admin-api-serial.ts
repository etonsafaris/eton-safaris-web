/** Two admin reads at a time. One was making every list wait behind counts and other panels. */
const MAX_IN_FLIGHT = 2;
let active = 0;
const queue: Array<() => void> = [];

export function serialAdminApi<T>(work: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      active += 1;
      work().then(resolve, reject).finally(() => {
        active -= 1;
        const next = queue.shift();
        if (next) next();
      });
    };
    if (active < MAX_IN_FLIGHT) run();
    else queue.push(run);
  });
}
