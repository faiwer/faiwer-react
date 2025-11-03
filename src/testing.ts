/**
 * Put your "setState" calls in tests within the `fn` callback. When the promise
 * resolves, the component will be re-rendered and its HTML will be up to date.
 * Layout effects will have finished running, but normal effects may still be
 * pending.
 */
export const act = async (fn: () => void | Promise<void>) => {
  await fn();
};
