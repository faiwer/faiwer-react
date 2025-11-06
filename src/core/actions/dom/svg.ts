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
  } else if (!SVG_CAMEL_ATTRS.has(name)) {
    name = name.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
  }
  element.setAttribute(name, value);
};

// Most of SVG attributes are in kebab-cases. Here is the list of exclusions.
const SVG_CAMEL_ATTRS = new Set([
  'attributeName',
  'repeatCount',
  'attributeType',
  'baseFrequency',
  'baseProfile',
  'calcMode',
  'clipPathUnits',
  'diffuseConstant',
  'edgeMode',
  'Experimental',
  'filterUnits',
  'gradientTransform',
  'gradientUnits',
  'kernelMatrix',
  'kernelUnitLength',
  'keyPoints',
  'keySplines',
  'keyTimes',
  'lengthAdjust',
  'limitingConeAngle',
  'markerHeight',
  'markerUnits',
  'markerWidth',
  'maskContentUnits',
  'maskUnits',
  'numOctaves',
  'pathLength',
  'patternContentUnits',
  'patternTransform',
  'patternUnits',
  'pointsAtX',
  'pointsAtY',
  'pointsAtZ',
  'preserveAlpha',
  'preserveAspectRatio',
  'primitiveUnits',
  'refX',
  'refY',
  'repeatDur',
  'requiredExtensions',
  'requiredFeatures',
  'Experimental',
  'specularConstant',
  'specularExponent',
  'spreadMethod',
  'startOffset',
  'stdDeviation',
  'stitchTiles',
  'surfaceScale',
  'systemLanguage',
  'tableValues',
  'targetX',
  'targetY',
  'textLength',
  'viewBox',
  'xChannelSelector',
  'yChannelSelector',
  'zoomAndPan',
]);
