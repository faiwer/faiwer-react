import { ReactError } from 'faiwer-react/core/reconciliation/errors/ReactError';
import type { TagAttrValue, TagFiberNode, TagStyles } from 'faiwer-react/types';

/**
 * Handles removing, toggling and adding tag styles.
 */
export const setTagStyles = (
  fiber: TagFiberNode,
  /** Should be a CSS-string (hyphens) or a CSS map (camelCase) */
  stylesRaw: TagAttrValue,
): void => {
  if (
    typeof stylesRaw !== 'string' &&
    stylesRaw != null &&
    typeof stylesRaw !== 'object'
  ) {
    throw new ReactError(fiber, `Unsupported format of styles`);
  }

  const elementStyle = (fiber.element as HTMLElement).style;
  const newStyles: TagStyles =
    typeof stylesRaw === 'string' ? strToStyles(stylesRaw) : (stylesRaw ?? {});

  if (Object.keys(newStyles).length > 0) {
    for (const key of Object.keys(fiber.data.styles ?? {})) {
      if (!(key in newStyles)) {
        if (key.includes('-')) {
          elementStyle.removeProperty(key);
        } else if (key in elementStyle) {
          // @ts-ignore It's wrongly typed as read-only.
          elementStyle[key as keyof TagStyles] = '';
        }
      }
    }

    for (const [key, value] of Object.entries(newStyles)) {
      const normalized = normalizeStyleValue(key, value);
      if (key.includes('-')) {
        elementStyle.setProperty(key, normalized as string);
      } else if (key in elementStyle) {
        // @ts-ignore It's wrongly typed as read-only.
        elementStyle[key as keyof TagStyles] = normalized;
      }
    }
  } else {
    fiber.element!.removeAttribute('style');
  }

  fiber.data.styles = newStyles;
};

/**
 * Converts a string like "color: red; font-size: 12px" to
 * { color: 'red', ['font-size']: '12px' }
 */
const strToStyles = (css: string): TagStyles => {
  cssDummy.style.cssText = css;
  return Object.fromEntries(
    Array.from(cssDummy.style).map((k) => [
      k,
      cssDummy.style.getPropertyValue(k),
    ]),
  );
};

const cssDummy = document.createElement('x-css-dummy');

/**
 * CSS properties that take a unitless number in vanilla CSS — assigning a
 * numeric value to any other length-ish property via the CSSOM gets silently
 * rejected (the setter coerces the number to a string and the browser fails to
 * parse it as a length). React appends `px` to numeric values for any property
 * not in this allowlist; we mirror that behaviour.
 *
 * Kept in sync with React's `isUnitlessNumber` set.
 */
const UNITLESS_NUMBERS = new Set<string>([
  'animationIterationCount',
  'aspectRatio',
  'borderImageOutset',
  'borderImageSlice',
  'borderImageWidth',
  'boxFlex',
  'boxFlexGroup',
  'boxOrdinalGroup',
  'columnCount',
  'columns',
  'flex',
  'flexGrow',
  'flexPositive',
  'flexShrink',
  'flexNegative',
  'flexOrder',
  'gridArea',
  'gridRow',
  'gridRowEnd',
  'gridRowSpan',
  'gridRowStart',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnSpan',
  'gridColumnStart',
  'fontWeight',
  'lineClamp',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'scale',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
  'fillOpacity',
  'floodOpacity',
  'stopOpacity',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeMiterlimit',
  'strokeOpacity',
  'strokeWidth',
]);

/**
 * Appends `px` to numeric CSS values unless:
 * - the property is unitless (e.g. `zIndex`, `opacity`),
 * - the value is `0` (CSS treats `0` and `0px` as equivalent — match React and
 *   emit the shorter form),
 * - the property is a CSS custom property (`--foo`), where the author controls
 *   the unit semantics.
 *
 * Non-numeric values are returned unchanged.
 */
const normalizeStyleValue = (key: string, value: unknown): unknown => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value === 0 ||
    key.startsWith('--') ||
    UNITLESS_NUMBERS.has(key)
  ) {
    return value;
  }

  return `${value}px`;
};
