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
      if (key.includes('-')) {
        elementStyle.setProperty(key, value as string);
      } else if (key in elementStyle) {
        // @ts-ignore It's wrongly typed as read-only.
        elementStyle[key as keyof TagStyles] = value;
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
