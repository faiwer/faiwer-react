import type { ReactContext } from './context';
import type { ContextFiberNode } from './fiber';
import type { Ref } from './refs';

export type UseStateItem<T = unknown> = {
  type: 'state';
  state: T;
  setter: StateSetter<T>;
};

export type UseMemoItem = {
  type: 'memo';
  value: unknown;
  deps: HookDeps;
};

export type UseRefItem<T = unknown> = {
  type: 'ref';
  value: Ref<T>;
};

export type UseEffectItem = {
  type: 'effect';
  mode: EffectMode;
  fn: EffectHandler;
  destructor: null | (() => void);
  deps: HookDeps | null;
};

export type UseContextItem<T = unknown> = {
  type: 'context';
  ctx: ReactContext<T>;
  destructor: () => void;
  providerFiber: ContextFiberNode | null;
};

export type HookStateItem =
  | UseStateItem
  | UseMemoItem
  | UseRefItem
  | UseEffectItem
  | UseContextItem;

export type HookStore = HookStateItem[];

/**
 * Deps used to invalidate the hook.
 * e.g., useMemo(..., [deps]);
 */
export type HookDeps = unknown[];

/** const [, setter] = useState(...) */
export type StateSetter<T> = (
  valueOrFn: // prettier-ignore
  | (T extends Function ? (prev: T) => T : T)
    | ((prev: T) => T),
) => void;

/**
 * In this library useEffect & useLayoutEffect are a little more complex. They
 * support async functions and abort signals. But they are still back-compatible
 * with the original React ones.
 */
export type EffectHandler = (
  signal: AbortSignal,
) => void | Promise<void> | (() => void);

export type EffectMode =
  // <div ref={onRef}/>
  | 'refs'
  // useLayoutEffect(fn);
  | 'layout'
  // useEffect();
  | 'normal';
