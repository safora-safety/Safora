/// <reference types="vite/client" />

declare module 'react-dom/client' {
  import React from 'react';
  export interface Root {
    render(children: React.ReactNode): void;
    unmount(): void;
  }
  export function createRoot(container: Element | DocumentFragment): Root;
}
