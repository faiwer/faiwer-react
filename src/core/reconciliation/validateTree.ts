import type { FiberNode } from 'faiwer-react/types';
import { nullthrows } from 'faiwer-react/utils';

/**
 * Validates the given fiber node and its subnodes. In case of error it throws.
 */
export const validateTree = (node: FiberNode, path = ''): void => {
  // Each rendered not must be associated with at least one real DOM-node.
  nullthrows(node.element, `${path}.element`);

  if (node.type === 'tag') {
    if (!node.tag) {
      throw new Error(`${path} has empty "tag" field `);
    }

    const domNode = node.role === 'portal' ? node.data : node.element;
    if (!(domNode instanceof Element)) {
      throw new Error(`${path} doesn't have element`);
    }
  } else if (node.type === 'component' && !node.component) {
    throw new Error(`${path} has empty "component" field `);
  } else if (node.role === 'context' && !node.data.ctx) {
    throw new Error(`${path} has no context`);
  } else if (node.type === 'text' && !(node.element instanceof Text)) {
    throw new Error(`${path}'s element is not a Text`);
  }

  for (const [idx, child] of node.children.entries()) {
    const label = getFiberPathLabel(child);
    const key = (child.key ?? idx) + `^${label}`;
    if (child.parent !== node) {
      throw new Error(
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
      ? `<${nullthrows(node.tag)}/>`
      : node.type === 'fragment'
        ? node.role === 'context'
          ? '<ctx/>'
          : '[]'
        : node.type === 'component'
          ? `<${node.component!.name || 'Comp'}/>`
          : 'unknown';
};
