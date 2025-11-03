import type { FiberNode } from 'faiwer-react/types';

/**
 * Returns true when the `left` node can be reused to reflect the `right` node.
 * It means they must share their `type`, `key`, `role`, `tag` and `component` fields.
 */
export const areFiberNodesEq = (
  left: FiberNode | null,
  right: FiberNode | null,
): boolean => {
  if (!left || !right) return left === right;

  if (left.type !== right.type || left.role !== right.role) return false;

  const lNode = left.tag ?? left.component;
  const rNode = right.tag ?? right.component;

  return lNode === rNode;
};
