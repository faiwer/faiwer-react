## What is it?

A naive React implementation. Why? What's wrong with the existing one? Nothing. I just wanted to implement it from scratch by myself. It can be used as a drop-in replacement for some simple React apps. May require some trivial changes, though.

## It supports

- JSX
- Functional components
- Hooks:
  - `useState`
  - `useRef`
  - `useMemo`, `useCallback`
  - `useStableCallback` (better version of `useEffectEvent`)
  - `useLayoutEffect`, `useEffect` (improved versions)
  - `useId`
  - `useContext`
- Tag-based refs
- Context
- Portals
- Fragments

## TODO

- Events:
  - "capture"-kind of events
  - camelCase events
  - custom `onChange` like in ReactDOM
- Error handling
- Direct component refs, `forwardRef`, `useImperativeHandle`
- More default hooks:
  - `useReducer`

## It does NOT support

… and probably never will:

- Class Components
- Synthetic events
- Portals:
  - Event bubling from portals
  - Rendering multiple portals in the same DOM node
- `memo` (becase components are memoized by default)
- Some less popular tools
  - `useInsertionEffect`
  - `useOptimistic` (could be polyfilled)
  - `useDeferredValue` (could be polyfilled)
  - `useDebugValue` (dev tools are not supported)
  - `<StrictMode/>`.
  - `<Profiler/>`.
  - `preconnect`, `prefetchDNS`, `preinit`, `preinitModule`, `preload`, `preloadModule`
- Modern stuff:
  - `useTransition`, `startTransition`
  - `<Suspense/>`, `lazy`.
- Form-based hooks (like `useActionState`, `useFormStatus`)
- React Dev Tools. Just take a look at `__REACT_DEVTOOLS_GLOBAL_HOOK__`, it's huge. E.g., it has `reactDevtoolsAgent`, a class with 20-30 methods…
- `flushSync` (not supported by the engine)
- SSR

## Major differences

- It renders HTML-comment for nullable nodes and some fragments. Why? It helps a lot to keep the reconcilation algorithm simple. Took this idea from Angular.
- No synthetic events. I don't see any reason to implement them.
- All components are memoized by default. Why not?
- No custom DOM-related code. This library is supposed to be simple and silly. Whereas React-DOM lib is huge.
- No modern fiber-driven stuff like `<Suspense>`, `cacheSignal`, or `use`. Too much work. It took React many years to cook it well :)
