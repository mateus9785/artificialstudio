// Espelha o shape de serializePost() em backend/src/routes/posts.routes.ts.
export interface Post {
  id: number
  title: string
  slug: string | null
  excerpt: string
  content: string | null
  imageUrl: string | null
  tag: string
  tagColor: string
  trending: boolean
  publishedAt: string
}

// Espelha serializeLabel() em backend/src/routes/kanban.routes.ts.
export interface KanbanLabel {
  id: number
  name: string
  color: string
  createdAt: string
}

// Espelha serializeCard() em backend/src/routes/kanban.routes.ts.
export interface KanbanCardData {
  id: number
  title: string
  description: string
  label: { id: number; name: string; color: string }
  status: 'todo' | 'doing' | 'done' | 'error'
  planStatus: 'none' | 'requested' | 'planning' | 'error'
  planError: string | null
  runImmediately: boolean
  tmuxSession: string | null
  error: string | null
  gitWatch: boolean
  baseCommit: string | null
  autoCompleted: boolean
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  updatedAt: string
}

// Espelha serializeUsage() em backend/src/routes/kanban.routes.ts.
export interface ClaudeUsage {
  sessionUsedPercent: number | null
  sessionResetsAt: string | null
  weekUsedPercent: number | null
  weekResetsAt: string | null
  updatedAt: string
}

// Espelha serializeLead() em backend/src/routes/scoutRuns.routes.ts.
export interface ScoutLead {
  id: number
  name: string
  category: string | null
  city: string | null
  state: string | null
  website: string | null
  address: string | null
  email: string | null
  phoneE164: string | null
  whatsappPhoneE164: string | null
  instagramUrl: string | null
  instagramFollowers: number | null
  facebookUrl: string | null
  facebookResponseTime: string | null
  chatWidget: string | null
  ecommercePlatform: string | null
  rating: number | null
  reviewsCount: number | null
  fitScore: number | null
  automationVerdict: string | null
  pipelineStatus: string | null
  mapsUrl: string | null
  siteStatus: string
  siteOfflineReason: string | null
  segmento: string | null
  porte: string | null
  catalogo: string | null
  vendeOnline: boolean | null
  atendePorWhatsapp: boolean | null
  vende: string[] | null
  sinaisAutomacao: string[] | null
  dores: string[] | null
  integracoes: string[] | null
  confianca: number | null
  resumo: string | null
  ganchoAbordagem: string | null
}

// Espelha serializeRun() em backend/src/routes/scoutRuns.routes.ts.
export interface ScoutRun {
  id: number
  niche: string
  city: string
  state: string | null
  radiusKm: number
  maxResults: number
  withLlm: boolean
  status: 'todo' | 'doing' | 'done' | 'error'
  result: { qualificados?: number; mediaScore?: number } | null
  error: string | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
}
