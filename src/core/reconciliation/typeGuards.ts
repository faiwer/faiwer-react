import type {
  ElementNode,
  ElementType,
  FiberNode,
  ReactContext,
  TagAttrValue,
} from 'faiwer-react/types';

/**
 * Returns true if the given fiber can contain children fiber nodes.
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
 * Validates that the given value can be used as:
 * - an event handler;
 * - a tag attribute value;
 * - styles (either a string or an object).
 *
 * Throws if not.
 */
export function assertsTagAttrValue(
  name: string,
  v: unknown,
): asserts v is TagAttrValue {
  switch (typeof v) {
    case 'undefined':
    case 'string':
    case 'boolean':
    case 'number':
    case 'function':
      return;

    case 'object':
      if (name === 'dangerouslySetInnerHTML' && isSetHtml(v)) return;
      if ((name === 'defaultValue' || name === 'value') && Array.isArray(v))
        return; // <select multiple/>
      if (v === null || name === 'style') return;

    case 'bigint':
    case 'symbol':
      throw new Error(
        `Unsupported format of tag attribute value (${String(v)})`,
      );
  }
}

export const isSetHtml = (value: unknown): value is { __html: string } => {
  let html: { __html: string } | null =
    typeof value === 'object' &&
    !!value &&
    '__html' in value &&
    typeof value.__html === 'string'
      ? { __html: value.__html }
      : null;
  return html !== null;
};

/**
 * Not used in the library, but it's a part of what React exports. Returns true
 * if the given value is something that `createElement` returns.
 */
export const isValidElement = (value: unknown): value is ElementNode => {
  return (
    typeof value === 'object' &&
    !!value &&
    'type' in value &&
    'props' in value &&
    'key' in value &&
    'children' in value
  );
};
