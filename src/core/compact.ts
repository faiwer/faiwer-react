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

// !--TODO: tsDoc.
export const isContainer = (
  fiber: FiberNode,
): fiber is FiberNode & { element: Container } =>
  fiber.element === containerSym;

/**
 * Returns true if the given `fiber` is in solo compact mode. This means it
 * doesn't have its own direct DOM element. Instead, its `element` refers to its
 * only child's `element`, avoiding the need for <!--brackets-->.
 */
export const isCompactSingleChild = (
  fiber: FiberNode,
): fiber is FiberNode & {
  element: DomNode;
} =>
  (fiber.type === 'fragment' || fiber.type === 'component') &&
  fiber.element !== containerSym &&
  !isEmptyOf(fiber.element!, fiber);

/**
 * Returns true if the given `fiber` is in none compact mode. This means it
 * has no fiber children, and its element is <!--r:empty:id-->
 */
export const isCompactNone = (
  fiber: FiberNode,
): fiber is FiberNode & {
  element: DomNode;
} =>
  (fiber.type === 'fragment' || fiber.type === 'component') &&
  isEmptyOf(fiber.element!, fiber);
