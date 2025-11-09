/** A ref produced in `useRef(default)` */
export type Ref<T> = { current: T };

/**
 * A function-based ref setter.
 * @example
 * <div ref={(node: HTMLDivElement | null) => …}
 * // ^ RefSetter<HTMLDivElement | null>
 **/
export type RefSetter<T> = (v: T) => void;

/**
 * HTML Tag refs:
 * @example
 * const ref = useRef<HTMLDivElement>()
 * <div ref={ref}/>
 **/
export type HtmlRef<T extends Element> = Ref<
  | T // DOM node is mounted
  | null // DOM node is destroyed
  | undefined // Initial value of useRef<HTMLElement>()
>;
