import 'dotenv/config'
import { app } from './app.js'
import { startAiChatWorker } from './services/aiChatWorker.ts'
import { startWaSuggestionWorker } from './services/waSuggestionWorker.ts'
import { initWhatsAppClient } from './services/whatsappClient.ts'

const port = Number(process.env.PORT) || 4000

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`)
  startAiChatWorker()
  startWaSuggestionWorker()
  initWhatsAppClient().catch((err) => console.error('[whatsapp] falha ao inicializar cliente:', err))
})
