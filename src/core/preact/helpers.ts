import type { ElementNode } from 'faiwer-react/types';
import { isJsxElementNode } from '../reconciliation/fibers';

/** Prepare the given arbitrary value to be send to the DevTools. */
export const marshall = (value: unknown): unknown => {
  try {
    const result = iteratee(value);
    if (result !== value) {
      return result; // Custom presentation.
    }

    if (Array.isArray(value)) {
      return value.map((v) => marshall(v));
    }

    if (typeof value === 'object' && !!value) {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, marshall(v)] as const),
      );
    }

    return value; // Scalar value.
  } catch {
    return `Could not serialize data`; // E.g., circular references.
  }
};

const iteratee = (v: unknown): unknown =>
  v instanceof Node
    ? domNodeLabel(v)
    : typeof v === 'function'
      ? { type: 'function', name: v.name ?? 'anonymous' }
      : isJsxElementNode(v)
        ? jsxNodeLabel(v)
        : v;

export const domNodeLabel = (node: Node) => ({
  type: 'html',
  name:
    node instanceof Element
      ? `<${node.tagName.toLowerCase()} />`
      : node instanceof Text
        ? `#(${node.textContent.slice(0, 30)}…)`
        : node instanceof Comment
          ? `<!--${node.textContent.slice(0, 30)}…-->`
          : `unknown DOM node`,
});

export const jsxNodeLabel = (jsx: ElementNode) => {
  const tagName =
    typeof jsx.type === 'string'
      ? jsx.type // Tag name
      : typeof jsx.type === 'function'
        ? jsx.type.name // Component name
        : jsx.type
          ? `portal:${jsx.type.tagName.toLowerCase()}`
          : `unknown`;
  const props = Object.keys(jsx.props).join(' ');
  return {
    type: 'html',
    name: `<${tagName}${props ? ` ${props}` : ''}/>`,
  };
};
