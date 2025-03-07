import * as React from 'react';

declare global {
  namespace NodeJS {
    interface Timeout {}
  }
  
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {}; 