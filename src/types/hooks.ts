import type { ReactContext } from './context';
import type { ContextFiberNode, FiberNode, TagState } from './fiber';
import type { RefObject } from './refs';

export type UseStateItem<T = unknown> = {
  type: 'state';
  state: T;
  setter: StateSetter<T>;
  destructor: null | (() => void);
  move: (newFiber: FiberNode) => void;
};

export type UseMemoItem = {
  type: 'memo';
  value: unknown;
  deps: HookDeps;
};

export type UseRefItem<T = unknown> = {
  type: 'ref';
  value: RefObject<T>;
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
  move: (newFiber: FiberNode) => void;
  providerFiber: ContextFiberNode | null;
};

export type ErrorInfo = {
  componentStack: string;
};

export type ErrorHandler = (error: unknown, info: ErrorInfo) => void;
export type UseErrorItem = {
  type: 'error';
  fn: ErrorHandler;
};

export type HookStateItem =
  | UseStateItem
  | UseMemoItem
  | UseRefItem
  | UseEffectItem
  | UseContextItem
  | UseErrorItem;

export type HookStore = HookStateItem[];

/**
 * Deps used to invalidate the hook.
 * e.g., useMemo(..., [deps]);
 */
export type HookDeps = unknown[];

/** const [, setter] = useState(...) */
export type StateSetter<T> = (valueOrFn: T | ((prev: T) => T)) => void;

/**
 * In this library useEffect & useLayoutEffect are a little more complex. They
 * support async functions and abort signals. But they are still back-compatible
 * with the original React ones.
 */
export type EffectHandler = (
  signal: AbortSignal,
) => void | Promise<void> | (() => void);

export type EffectMode =
  // <input/>.value restoration
  | 'afterActions'
  // <div ref={onRef}/>
  | 'refsUnmount'
  | 'refsMount'
  // useLayoutEffect(fn);
  | 'layout'
  // useEffect();
  | 'normal';

export type Reducer<TState, TAction> = (
  state: TState,
  action: TAction,
) => TagState;

export type Dispatch<A> = (action: A) => void;
