// Типы для React
declare module 'react' {
  export interface MouseEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    target: EventTarget;
    currentTarget: EventTarget & T;
  }
  
  export interface TouchEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    target: EventTarget;
    currentTarget: EventTarget & T;
  }
  
  export interface SyntheticEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    target: EventTarget;
    currentTarget: EventTarget & T;
  }
  
  export interface ChangeEvent<T = Element> extends SyntheticEvent<T> {
    target: EventTarget & T;
  }
  
  export interface FormEvent<T = Element> extends SyntheticEvent<T> {}
}

// Типы для Next.js
declare module 'next/router' {
  export interface Router {
    route: string;
    pathname: string;
    query: Record<string, string | string[]>;
    asPath: string;
    push(url: string, as?: string, options?: any): Promise<boolean>;
    replace(url: string, as?: string, options?: any): Promise<boolean>;
    reload(): void;
    back(): void;
    prefetch(url: string): Promise<void>;
    beforePopState(cb: (state: any) => boolean): void;
    events: {
      on(type: string, handler: (...evts: any[]) => void): void;
      off(type: string, handler: (...evts: any[]) => void): void;
      emit(type: string, ...evts: any[]): void;
    };
    isFallback: boolean;
    isReady: boolean;
    isPreview: boolean;
  }
  
  export function useRouter(): Router;
}

// Типы для js-cookie
declare module 'js-cookie' {
  interface CookieAttributes {
    expires?: number | Date;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  }
  
  interface CookiesStatic {
    set(name: string, value: string | object, options?: CookieAttributes): string | undefined;
    get(name: string): string | undefined;
    remove(name: string, options?: CookieAttributes): void;
    getJSON(name: string): any;
    withAttributes(attributes: CookieAttributes): CookiesStatic;
    withConverter(converter: {
      read: (value: string) => string;
      write: (value: string) => string;
    }): CookiesStatic;
    noConflict(): CookiesStatic;
  }
  
  const Cookies: CookiesStatic;
  export default Cookies;
}

// Типы для CSS модулей
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
} 