/**
 * SVG is weird. Some of the attributes are in camelCase, and some are in
 * kebab-case. This methods takes into account SVG-based nuances and sets the
 * given attribute in the right way.
 */
export const setSvgAttribute = (
  element: SVGElement,
  name: string,
  value: string,
): void => {
  if (name === 'className') {
    name = 'class';
  } else if (!SVG_KEBAB.has(name)) {
    name = name.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
  }
  element.setAttribute(name, value);
};

// Most of SVG attributes are in kebab-cases. Here is the list of exclusions.
const SVG_KEBAB = new Set([
  'viewBox',
  'preserveAspectRatio',
  'patternUnits',
  'patternContentUnits',
  'maskUnits',
  'maskContentUnits',
  'markerWidth',
  'markerHeight',
]);
