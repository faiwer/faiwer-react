/**
 * Put your "setState" calls in tests in the `fn` callback. When the promise is
 * reolved the component is rerender. Thus its HTML is up to date. Its layout
 * effects are finished. But its normal effects are not finished yet.
 * @param fn
 */
export const act = async (fn: () => void | Promise<void>) => {
  await fn();
};
