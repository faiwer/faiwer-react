/** A ref produced in `useRef(default)` */
export type RefObject<T> = { current: T };

/**
 * A function-based ref setter.
 * @example
 * <div ref={(node: HTMLDivElement | null) => …}
 * // ^ RefSetter<HTMLDivElement | null>
 **/
export type RefSetter<T> = (v: T | null) => void;

/**
 * Both `RefSetter` or `RefObject`.
 */
export type Ref<T> = RefObject<T | null> | RefSetter<T>;
