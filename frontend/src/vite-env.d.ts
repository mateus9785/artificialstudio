/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_GA4_ID?: string
  readonly VITE_CLARITY_ID?: string
  readonly VITE_PIXEL_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
