import type { ElementNode, FiberNode, UnknownProps } from 'faiwer-react/types';
import { RElementSym, type RJsxElementNode } from './types';
import { isJsxElementNode } from '../reconciliation/fibers';

/**
 * Converts FiberNode into originl React's JSX.Element
 */
export const fiberToRJSX = (fiber: FiberNode): RJsxElementNode => {
  return {
    $$typeof: RElementSym,
    key: fiber.key,
    type:
      fiber.type === 'component'
        ? fiber.component
        : fiber.type === 'tag'
          ? fiber.tag
          : RElementSym,
    props: fiber.props ? propsToRProps(fiber.props) : {},
    ref: null,
  };
};

export function ReactPortalDummy() {
  return null;
}

export const jsxElementToRJSX = (element: ElementNode): RJsxElementNode => {
  const { type } = element;
  return {
    $$typeof: RElementSym,
    key: element.key ? String(element.key) : null,
    type: type instanceof HTMLElement ? ReactPortalDummy : type,
    props: propsToRProps(element.props),
    ref: null,
  };
};

export const propsToRProps = (props: UnknownProps): UnknownProps => {
  if (props === null) {
    return {}; // E.g., a null fiber.
  }

  return new Proxy(props, {
    get: (target, key) => {
      if (key !== 'children') {
        return target[key];
      }

      const { children } = target;
      if (!Array.isArray(children)) {
        return isJsxElementNode(children)
          ? jsxElementToRJSX(children)
          : isFiberNode(children)
            ? fiberToRJSX(children)
            : children;
      }

      return children.map((child) =>
        isJsxElementNode(child)
          ? jsxElementToRJSX(child)
          : isFiberNode(child)
            ? fiberToRJSX(child)
            : child,
      );
    },
  });
};

const isFiberNode = (item: unknown): item is FiberNode =>
  !!item &&
  typeof item === 'object' &&
  'id' in item &&
  'key' in item &&
  'role' in item;
