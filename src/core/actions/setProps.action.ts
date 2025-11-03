import type { FiberNode } from 'faiwer-react/types';
import type { SetPropsAction } from 'faiwer-react/types/actions';

/**
 * Updates the set of props for the given fiber node. This doesn't make any
 * DOM changes or run components.
 */
export function setPropsAction(fiber: FiberNode, { props }: SetPropsAction) {
  if (
    fiber.type !== 'component' &&
    fiber.type !== 'tag' &&
    fiber.role !== 'context'
  ) {
    throw new Error(`setProps action is not applicable to this fiber node`);
  }
  fiber.props = props;
}
