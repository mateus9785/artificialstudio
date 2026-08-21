import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'

const ADMIN_AUDIENCE = 'admin-panel'
const REMEMBER_EXPIRES_IN = process.env.JWT_REMEMBER_EXPIRES_IN || '30d'

interface AdminSubject {
  id: number
  username: string
}

interface SignAdminTokenOptions {
  remember?: boolean
}

export function signAdminToken(admin: AdminSubject, { remember = false }: SignAdminTokenOptions = {}): string {
  // JWT_SECRET ausente derruba isso em runtime (jwt.sign lança) — mesmo comportamento de antes,
  // só que agora explícito no tipo em vez de `string | undefined` passando disfarçado.
  return jwt.sign({ sub: admin.id, username: admin.username, role: 'admin' }, process.env.JWT_SECRET as string, {
    // `expiresIn` só aceita strings de duração conhecidas em tempo de compilação (tipo `StringValue`
    // do pacote `ms`); a nossa vem de env var, então o formato só é validado em runtime pelo próprio
    // jwt.sign — mesmo tipo de fronteira de confiança que JWT_SECRET acima.
    expiresIn: (remember ? REMEMBER_EXPIRES_IN : process.env.JWT_EXPIRES_IN || '12h') as SignOptions['expiresIn'],
    audience: ADMIN_AUDIENCE,
  })
}

export interface AdminTokenPayload extends JwtPayload {
  sub: string
  username: string
  role: 'admin'
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  const payload = jwt.verify(token, process.env.JWT_SECRET as string, { audience: ADMIN_AUDIENCE }) as AdminTokenPayload
  if (payload.role !== 'admin') {
    throw new Error('Token não é de um administrador.')
  }
  return payload
}
