export const nullthrows = <T>(
  val: T | null | undefined,
  name = `given value`,
): T => {
  if (val == null) {
    throw new Error(`${name} is null or undefined`);
  }

  return val;
};
