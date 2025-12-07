import { type Dispatch } from '../types';
import { useState } from './useState';

// No action + initial fabric
export function useReducer<S, I>(
  reducer: (st: S) => S,
  initialArg: I & S,
  initializer: (initialArg: I & S) => S,
): [S, () => void];

// No action + initial state
export function useReducer<S>(
  reducer: (st: S) => S,
  initialArg: S,
  initializer?: undefined,
): [S, () => void];

// Action + initial arg that is subset of S
export function useReducer<S, A, I>(
  reducer: (st: S, action: A) => S,
  initialArg: I & S,
  initializer: (initialArg: I & S) => S,
): [S, Dispatch<A>];

// Action + arbitrary initial arg
export function useReducer<S, A, I>(
  reducer: (st: S, action: A) => S,
  initialArg: I,
  initializer: (initialArg: I) => S,
): [S, Dispatch<A>];

// Action + initial state
export function useReducer<S, A>(
  reducer: (st: S, action: A) => S,
  initialArg: S,
  initializer?: undefined,
): [S, Dispatch<A>];

// Implementation
export function useReducer<S, A>(
  reducer: (st: S, action: A) => S,
  initialArg: S,
  initializer?: (initialArg: unknown) => S,
): [S, Dispatch<A>] {
  const [state, setState] = useState<S>(() =>
    initializer ? initializer(initialArg) : initialArg,
  );
  const [dispatch] = useState(
    (): Dispatch<A> =>
      (action: A): void => {
        setState((prevSt) => reducer(prevSt, action));
      },
  );

  return [state, dispatch];
}
