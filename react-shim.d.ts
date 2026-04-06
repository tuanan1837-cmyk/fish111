declare module 'react' {
  const React: any;
  export default React;

  export function useState<S>(initialState: S | (() => S)): [S, (value: S | ((prevState: S) => S)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useRef<T>(initialValue: T | null): { current: T };
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
  export function useMemo<T>(factory: () => T, deps: readonly any[]): T;
  export function useLayoutEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useContext<T>(context: any): T;
  export const Component: any;
  export const Fragment: any;
  export const StrictMode: any;
  export function createRoot(container: any): any;

  export type ChangeEvent<T = any> = any;
  export type MouseEvent = any;
  export type TouchEvent = any;
  export type ReactNode = any;
  export type ReactElement = any;

  export namespace JSX {
    interface Element {}
    interface ElementClass {}
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    interface ElementAttributesProperty { props: {}; }
    interface ElementChildrenAttribute { children: {}; }
  }
}

declare namespace React {
  type ChangeEvent<T = any> = any;
  type MouseEvent = any;
  type TouchEvent = any;
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export function jsxDEV(type: any, props: any, key?: any, isStaticChildren?: boolean, source?: any, self?: any): any;
}

declare module 'howler' {
  export const Howl: any;
  export type Howl = any;
  export const Howler: any;
  const _default: any;
  export default _default;
}

declare module 'react-dom/client' {
  export function createRoot(container: any): any;
}

declare module '*.css' {
  const content: any;
  export default content;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface ElementClass {}
  interface ElementAttributesProperty { props: {}; }
  interface ElementChildrenAttribute { children: {}; }
}
