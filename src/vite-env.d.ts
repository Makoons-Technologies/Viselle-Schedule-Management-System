/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEBUG_INSPECTOR?: string;
}

declare module '*.md?raw' {
  const content: string;
  export default content;
}
