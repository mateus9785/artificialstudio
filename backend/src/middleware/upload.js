import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import multer from 'multer'
import sharp from 'sharp'
import { slugify } from '../utils/slug.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = path.join(__dirname, '../../uploads/posts')

fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_WEBP_BYTES = 150 * 1024

export const uploadPostImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(new Error('Formato de imagem não suportado. Use JPEG, PNG, WEBP ou GIF.'))
    }
    cb(null, true)
  },
})

// Converte o buffer para .webp reduzindo qualidade e, se necessário, dimensões
// até caber no limite de 150KB.
export async function convertToWebp(buffer) {
  let quality = 80
  let output = await sharp(buffer).webp({ quality }).toBuffer()

  while (output.length > MAX_WEBP_BYTES && quality > 30) {
    quality -= 10
    output = await sharp(buffer).webp({ quality }).toBuffer()
  }

  if (output.length > MAX_WEBP_BYTES) {
    const { width } = await sharp(buffer).metadata()
    let targetWidth = width
    while (output.length > MAX_WEBP_BYTES && targetWidth > 300) {
      targetWidth = Math.round(targetWidth * 0.85)
      output = await sharp(buffer).resize({ width: targetWidth }).webp({ quality: 60 }).toBuffer()
    }
  }

  return output
}

// Nomeia o arquivo a partir do título do post (slug); se o título ainda não
// foi preenchido, cai para o nome original do arquivo enviado.
export function resolveWebpFilename(title, originalname) {
  const base = slugify(title) || slugify(path.parse(originalname || '').name) || 'imagem'
  let filename = `${base}.webp`
  let attempt = 1

  while (fs.existsSync(path.join(UPLOADS_DIR, filename))) {
    attempt += 1
    filename = `${base}-${attempt}.webp`
  }

  return filename
}
