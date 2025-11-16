## What is it?

A naive React implementation. Why? What's wrong with the existing one? Nothing. I just wanted to implement it from scratch by myself. It can be used as a drop-in replacement for some simple React apps. May require some trivial changes, though.

## It supports

- JSX
- Functional components
- Class components (limited)
- Hooks:
  - `useState`
  - `useRef`
  - `useMemo`, `useCallback`
  - `useStableCallback` (better version of `useEffectEvent`)
  - `useLayoutEffect`, `useEffect` (improved versions)
  - `useId`
  - `useContext`
- Refs
- Context
- Portals
- Fragments

## Installation

- `npm uninstall react react-dom @types/react @types/react-dom`
- `npm i --save react@npm:@faiwer/react`
- `npm i --save --force react-dom@npm:@faiwer/react-dom`
- You might need to update your `tsconfig.json` (no necessarily):
  ```json
  "compilerOptions": {
    "jsx": "react-jsx",
  }
  ```
  Or use `"jsx": "preserve"`
- If you're using `eslint-plugin-react` than configure this in your .eslintrc:
  ```json
  "settings": {
    "react": { "version": "19" } // not 'detect'
  },
  ```
- Good luck. If your project is big enough, I'm pretty sure you got a ton of type errors. Sorry :-)

### Usage

To mount an app:

```tsx
const container = document.getElementById('root');
createRoot(container).render(<App />);
```

## TODO

- 1st line
  - form control values:
    - `<select/>` & `<option/>`
  - `dangerouslySetInnerHTML`
  - refs: `useImperativeHandle`
  - Error handling
  - support solo-compact mode over bracket-compact mode
- 2rd line
  - HMR
  - Resolve "TODO: add a test" comments
  - `runComponent` is not pure. Some hooks change the state during the rendering phase. Fix it.
  - `useReducer`

## It does NOT support

… and probably never will:

- Class Components: `getSnapshotBeforeUpdate`
- Synthetic events
- Portals:
  - Event bubbling from portals
  - Rendering multiple portals in the same DOM node
- `memo` (because components are memoized by default)
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

- It renders HTML-comment for nullable nodes and some fragments. Why? It helps a lot to keep the reconciliation algorithm simple. Took this idea from Angular.
- No synthetic events. I don't see any reason to implement them.
- All components are memoized by default. Why not?
- No custom DOM-related code. This library is supposed to be simple and silly. Whereas React-DOM lib is huge.
- No modern fiber-driven stuff like `<Suspense>`, `cacheSignal`, or `use`. Too much work. It took React many years to cook it well :)
