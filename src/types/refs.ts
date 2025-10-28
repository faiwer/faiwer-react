/** A ref produced in `useRef(default)` */
export type Ref<T> = { current: T | null };

/**
 * A function-based ref setter.
 * @example
 * <div ref={(node: HTMLDivElement | null) => …}
 **/
export type RefSetter<T> = (v: T | null) => void;

/**
 * HTML Tag refs:
 * @example
 * const ref = useRef<HTMLDivElement>()
 * <div ref={ref}/>
 **/
export type HtmlRef<T extends HTMLElement> = Ref<T | null>;
