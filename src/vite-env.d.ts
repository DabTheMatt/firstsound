/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIELD_FEEDBACK_URL?: string
}

interface Performance {
  memory?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
}
