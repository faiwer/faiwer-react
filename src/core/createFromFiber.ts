import type { Action, SetRefAction } from 'faiwer-react/types/actions';
import { type FiberNode } from '../types';
import { assertsTagAttrValue } from './helpers';

/**
 * Prepares a list of actions allowing to create the given fiber node in DOM.
 */
export const createFromFiber = (fiber: FiberNode): Action[] => {
  switch (fiber.type) {
    case 'component':
    case 'fragment':
      return [
        { type: 'CreateComment', fiber, mode: 'begin' },
        ...fiber.children.map((f) => createFromFiber(f)).flat(),
        { type: 'CreateComment', fiber, mode: 'end' },
      ];

    case 'text':
      return [{ type: 'CreateText', fiber }];

    case 'null':
      return [{ type: 'CreateComment', fiber, mode: 'null' }];

    case 'tag': {
      const actions: Action[] = [{ type: 'CreateTag', fiber }];

      for (const [k, v] of Object.entries(fiber.props ?? EMPTY)) {
        assertsTagAttrValue(v);
        actions.push({
          type: 'SetAttr',
          fiber,
          name: k,
          value: v,
        });
      }

      if (fiber.ref) {
        actions.push({
          type: 'SetRef',
          fiber,
          ref: fiber.ref as SetRefAction['ref'],
          dontUnsetRef: true,
        });
      }

      for (const child of fiber.children) {
        actions.push(...createFromFiber(child));
      }

      return actions;
    }
  }
};

const EMPTY = {};
