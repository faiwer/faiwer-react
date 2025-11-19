import type { Action, SetRefAction } from 'faiwer-react/types/actions';
import { type FiberNode, type TagAttrValue } from '../../../types';
import { assertsTagAttrValue } from '../typeGuards';

/**
 * Prepares a list of actions allowing to create the given fiber node in DOM.
 */
export const collectActionsFromNewFiber = (fiber: FiberNode): Action[] => {
  switch (fiber.type) {
    case 'component':
    case 'fragment':
      return [
        ...fiber.children.map((f) => collectActionsFromNewFiber(f)).flat(),
        { type: 'CreateContainer', fiber },
      ];

    case 'text':
      return [{ type: 'CreateText', fiber }];

    case 'null':
      return [{ type: 'CreateComment', fiber, mode: 'null' }];

    case 'tag': {
      for (const [k, v] of Object.entries(fiber.props ?? EMPTY)) {
        assertsTagAttrValue(k, v);
      }

      const actions: Action[] = [
        {
          type: 'CreateTag',
          fiber,
          attrs: (fiber.props as Record<string, TagAttrValue>) ?? null,
          ref: fiber.ref as SetRefAction['ref'],
        },
      ];

      for (const child of fiber.children) {
        actions.push(...collectActionsFromNewFiber(child));
      }

      return actions;
    }
  }
};

const EMPTY = {};
