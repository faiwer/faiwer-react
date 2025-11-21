import { type App, type FiberNode } from 'faiwer-react/types';
import { FAKE_CONTAINER_TAG } from './fibers';
import { nullthrowsForFiber, ReactError } from './errors/ReactError';
import { isCompactNone, isCompactSingleChild, isContainer } from '../compact';

export const validateApp = (app: App): void => {
  app.invalidatedComponents.traverse((fiber) => {
    if (!fiber.parent) {
      throw new ReactError(fiber, 'Orphan component invalidated');
    }

    if (fiber.parent.tag === FAKE_CONTAINER_TAG) {
      throw new ReactError(fiber, `Cannot invalidate not-mounted fiber node`);
    }
  });

  validateTree(app.root);
};

/**
 * Validates the given fiber node and its subnodes. In case of error it throws.
 */
const validateTree = (node: FiberNode, path = ''): void => {
  // Each rendered node must be associated with at least one real DOM node.
  nullthrowsForFiber(node, node.element, `${path}.element`);

  if (node.type === 'tag') {
    if (!node.tag) {
      throw new ReactError(node, `${path} has empty "tag" field `);
    }

    const domNode = node.role === 'portal' ? node.data : node.element;
    if (!(domNode instanceof Element)) {
      throw new ReactError(node, `${path} doesn't have element`);
    }
  } else if (node.type === 'component') {
    if (!node.component) {
      throw new ReactError(node, `${path} has empty "component" field `);
    }

    if (isContainer(node) && node.children.length < 2) {
      if (!node.children[0] || !isContainer(node.children[0])) {
        throw new ReactError(
          node,
          `Fiber containers must have more than 1 child.`,
        );
      }
    } else if (isCompactNone(node) && node.children.length !== 0) {
      throw new ReactError(
        node,
        `Empty fiber containers must have 0 children.`,
      );
    } else if (isCompactSingleChild(node) && node.children.length !== 1) {
      throw new ReactError(
        node,
        `Single-child fibers must have exactly 1 child.`,
      );
    }
  } else if (node.role === 'context' && !node.data.ctx) {
    throw new ReactError(node, `${path} has no context`);
  } else if (node.type === 'text' && !(node.element instanceof Text)) {
    throw new ReactError(node, `${path}'s element is not a Text`);
  }

  for (const [idx, child] of node.children.entries()) {
    const label = getFiberPathLabel(child);
    const key = (child.key ?? idx) + `^${label}`;
    if (child.parent !== node) {
      throw new ReactError(
        child,
        `${path}.${key}.parent is ${child.parent ? 'wrong' : 'empty'}`,
      );
    }
    validateTree(child, `${path}.${key}`);
  }
};

const getFiberPathLabel = (node: FiberNode): string => {
  return node.type === 'text' || node.type === 'null'
    ? node.type
    : node.type === 'tag'
      ? `<${nullthrowsForFiber(node, node.tag)}/>`
      : node.type === 'fragment'
        ? node.role === 'context'
          ? '<ctx/>'
          : '[]'
        : node.type === 'component'
          ? `<${node.component!.name || 'Comp'}/>`
          : 'unknown';
};
