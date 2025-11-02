import type {
  ElementNode,
  ElementType,
  FiberNode,
  ReactContext,
  TagAttrValue,
} from 'faiwer-react/types';
import { FRAGMENT_TAG } from './fibers';

/**
 * Returns true if the given fiber can container children fiber nodes.
 */
export const isContainerFiber = (fiber: FiberNode): boolean =>
  fiber.type === 'component' ||
  fiber.type === 'fragment' ||
  fiber.type === 'tag';
// The rest of them: tag, null, text

export const isContextProvider = (
  node: ElementType | ReactContext['Provider'],
): node is ReactContext['Provider'] => {
  const ctx: ReactContext['Provider'] | null =
    typeof node === 'object' && node && '__ctx' in node ? node : null;
  return ctx !== null;
};

/**
 * Validates that the given value can be used as an event handler or a tag
 * attribute value. Throws if not.
 */
export function assertsTagAttrValue(v: unknown): asserts v is TagAttrValue {
  switch (typeof v) {
    case 'undefined':
    case 'string':
    case 'boolean':
    case 'number':
    case 'function':
      return;

    case 'object':
      if (v === null) return;

    case 'bigint':
    case 'symbol':
      throw new Error(
        `Unsupported format of tag attribute value (${String(v)})`,
      );
  }
}

/**
 * Returns true if the given JSX.Element is a tag node or a component node.
 */
export const isElementNode = (element: JSX.Element): element is ElementNode =>
  !!element &&
  // string, number, boolean, null, undefined
  typeof element === 'object' &&
  // <Fragment/>, </>, []
  !Array.isArray(element);

/**
 * Returns true if the given JSX.Element is </>, <Fragment/> or [].
 */
export const isFragmentElementNode = (
  element: JSX.Element,
): element is Omit<ElementNode, 'type'> & { type: typeof FRAGMENT_TAG } =>
  isElementNode(element) && element.type === FRAGMENT_TAG;
