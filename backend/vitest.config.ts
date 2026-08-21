import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    env: {
      // Baixo de propósito: o teste de timeout do claudeRunner usa fake timers pra avançar
      // exatamente até aqui em vez de esperar os 180s de produção.
      AI_CHAT_TIMEOUT_MS: '100',
    },
  },
})
