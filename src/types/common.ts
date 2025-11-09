// Some of HTMLElement-based types (e.g., HTMLFormElement) have [K: string] &
// [K: number] inside. We must filter them out, otherwise it breaks complex
// types like PropertiesOnly.
export type RemoveIndexSignature<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
      ? never
      : typeof Symbol.iterator extends K
        ? never
        : K]: T[K];
};

export type RemapKeys<T, KeyMap extends Record<keyof any, keyof any>> = {
  [K in keyof T as K extends keyof KeyMap ? KeyMap[K] : K]?: T[K];
};
