import type { FiberNode } from 'faiwer-react/types';
import { getParentElement } from './helpers';
import { createCommentAction } from './createComment.action';
import { setAttrAction } from './setAttr.action';
import type { CreateTagAction } from 'faiwer-react/types/actions';
import { setRefAction } from './setRef.action';

/**
 * Handles two scenarios:
 * - Creates a <!--r:portal:id--> comment for portal fibers
 * - Creates a new tag DOM element for tag fibers
 *
 * This doesn't create child nodes or set attributes/event handlers.
 */
export function createTagAction(
  fiber: FiberNode,
  { attrs, ref }: CreateTagAction,
): void {
  if (fiber.type !== 'tag') {
    throw new Error(`createTagAction supports only tag-fiber-nodes.`);
  }

  if (fiber.data instanceof HTMLElement) {
    // This is a portal, not a regular tag. We shouldn't create it since it
    // already exists outside the app's DOM subtree. Instead, create a
    // <!--r:portal:id--> comment node.
    createCommentAction(fiber, { mode: 'portal' });
  } else if (fiber.tag !== 'root') {
    // 'root' is a special case - it's the node where the app is mounted.
    const tag = SVG_TAGS.has(fiber.tag)
      ? document.createElementNS('http://www.w3.org/2000/svg', fiber.tag)
      : document.createElement(fiber.tag);
    fiber.element = tag;
    getParentElement(fiber).appendChild(fiber.element);

    if (fiber.element instanceof HTMLInputElement) {
      if (attrs?.type === 'radio') {
        attrs.checked ??= undefined;
      }
      if (typeof attrs?.type === 'string') {
        fiber.element.type = attrs.type;
      }
    }

    for (const [name, value] of Object.entries(attrs ?? EMPTY)) {
      setAttrAction(fiber, { name, value });
    }

    if (ref) {
      setRefAction(fiber, { ref, dontUnsetRef: true });
    }
  }
}

const EMPTY: NonNullable<CreateTagAction['attrs']> = {};

const SVG_TAGS = new Set([
  // Core SVG Elements:
  'svg',
  'g',
  'defs',
  'symbol',
  'use',
  'image',
  'switch',
  'style',
  // Basic Shapes:
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'path',
  // Text Elements:
  'text',
  'tspan',
  'tref',
  'textPath',
  'altGlyph',
  'glyphRef',
  // Descriptive & Metadata:
  'title',
  'desc',
  'metadata',
  // Container Elements:
  'foreignObject',
  'marker',
  'pattern',
  'mask',
  'clipPath',
  'filter',
  // Gradient & Painting Elements:
  'linearGradient',
  'radialGradient',
  'stop',
  // Animation Elements:
  'animate',
  'animateMotion',
  'animateTransform',
  'set',
  // Filter Primitive Elements:
  'feBlend',
  'feColorMatrix',
  'feComponentTransfer',
  'feComposite',
  'feConvolveMatrix',
  'feDiffuseLighting',
  'feDisplacementMap',
  'feDropShadow',
  'feFlood',
  'feFuncA',
  'feFuncB',
  'feFuncG',
  'feFuncR',
  'feGaussianBlur',
  'feImage',
  'feMerge',
  'feMergeNode',
  'feMorphology',
  'feOffset',
  'fePointLight',
  'feSpecularLighting',
  'feSpotLight',
  'feTile',
  'feTurbulence',
  // Font Elements:
  'font',
  'glyph',
  'hkern',
  'vkern',
  'font-face',
  'font-face-src',
  'font-face-uri',
  'font-face-format',
  'font-face-name',
  'missing-glyph',
]);
