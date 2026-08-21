import type { NextFunction, Request, Response } from 'express'

/**
 * Express 4 não encaminha rejeições de handlers async para o middleware de erro
 * sozinho — sem isso, qualquer erro (ex: deadlock do MySQL) derruba o processo inteiro.
 *
 * Extraído de 5 cópias idênticas espalhadas pelas rotas (chat/financeiro/kanban/
 * scoutRuns/whatsapp) durante a migração pra TypeScript — mesmo comportamento, uma
 * única definição tipada em vez de cinco.
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
