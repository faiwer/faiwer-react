import type { Ref } from './refs';

export type UseRefItem = {
  type: 'ref';
  value: Ref<unknown>;
};
