import {
  containerSym,
  type Container,
  type DomNode,
  type FiberNode,
} from '../types';
import { buildCommentText } from './reconciliation/comments';

/**
 * Returns true if domNode is <!--r:empty:ID--> where ID is fiber.id
 */
const isEmptyOf = (
  domNode: Node | FiberNode['element'],
  fiber: FiberNode,
): domNode is Comment =>
  domNode instanceof Comment &&
  domNode.textContent === buildCommentText('empty', fiber.id);

// Returns true when the given fiber is a component or a fragment that contains
// more than one direct DOM-nodes.
export const isAutoContainer = (
  fiber: FiberNode,
): fiber is FiberNode & { element: Container } =>
  fiber.element === containerSym;

/**
 * Returns true if the given `fiber` is in the single-child mode. This means it
 * its `element` refers to its only child's DOM element.
 */
export const isSingleChildContainer = (
  fiber: FiberNode,
): fiber is FiberNode & {
  element: DomNode;
} =>
  (fiber.type === 'fragment' || fiber.type === 'component') &&
  fiber.element !== containerSym &&
  !isEmptyOf(fiber.element!, fiber);

/**
 * Returns true if the given `fiber` is in the empty mode. This means it has no
 * fiber children, and its element is <!--r:empty:id-->
 */
export const isEmptyContainer = (
  fiber: FiberNode,
): fiber is FiberNode & {
  element: DomNode;
} =>
  (fiber.type === 'fragment' || fiber.type === 'component') &&
  isEmptyOf(fiber.element!, fiber);
