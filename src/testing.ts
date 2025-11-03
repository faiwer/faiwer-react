/**
 * Put your "setState" calls in tests in the `fn` callback. When the promise is
 * resolved the component is re-rendered. Thus its HTML is up to date. Its
 * layout effects are finished. But its normal effects are not finished yet.
 */
export const act = async (fn: () => void | Promise<void>) => {
  await fn();
};
