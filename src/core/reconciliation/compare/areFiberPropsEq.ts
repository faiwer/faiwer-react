import type { FiberNode, UnknownProps } from 'faiwer-react/types';

/**
 * Returns false when `r` !== `l` and requires updating. This doesn't involve
 * any `children` checks.
 */
export const areFiberPropsEq = (l: FiberNode, r: FiberNode): boolean => {
  if (l.ref !== r.ref) {
    return false;
  }

  const lProps = (l.props ?? EMPTY) as UnknownProps;
  const rProps = (r.props ?? EMPTY) as UnknownProps;
  const lPropKeys = Object.keys(lProps);
  if (lPropKeys.length !== Object.keys(rProps).length) {
    return false;
  }

  return lPropKeys.every((k) => lProps[k] === rProps[k]);
};

const EMPTY = {};
