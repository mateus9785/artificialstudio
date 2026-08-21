import bcrypt from 'bcryptjs'
import 'dotenv/config'
import { pool } from './pool.ts'

interface SeedPost {
  title: string
  excerpt: string
  tag: string
  tag_color: string
  trending: boolean
  published_at: string
}

const SEED_POSTS: SeedPost[] = [
  {
    title: 'Como as IAs de atendimento estão engolindo os formulários estáticos',
    excerpt:
      'Formulários convencionais convertem 2-4%. IAs de qualificação chegam a 30%. Entenda a tecnologia que está mudando o jogo.',
    tag: 'Inteligência Artificial',
    tag_color: '#22d3ee',
    trending: true,
    published_at: '2025-06-01',
  },
  {
    title: 'O segredo do tráfego pago para páginas de alta conversão',
    excerpt:
      'Gastar em anúncios sem uma landing page otimizada é jogar dinheiro fora. Veja o checklist que usamos antes de ligar qualquer campanha.',
    tag: 'Marketing Digital',
    tag_color: '#a855f7',
    trending: false,
    published_at: '2025-05-01',
  },
  {
    title: 'Por que a velocidade do seu site define o seu faturamento',
    excerpt:
      'Para cada segundo a mais de carregamento, você perde 7% de conversão. Aprenda como chegamos a scores acima de 98 no PageSpeed.',
    tag: 'Performance Web',
    tag_color: '#f59e0b',
    trending: true,
    published_at: '2025-04-01',
  },
]

async function seed(): Promise<void> {
  const username = process.env.ADMIN_SEED_USERNAME
  const password = process.env.ADMIN_SEED_PASSWORD

  if (!username || !password) {
    throw new Error('Defina ADMIN_SEED_USERNAME e ADMIN_SEED_PASSWORD no .env antes de rodar o seed.')
  }

  const connection = await pool.getConnection()
  try {
    const [existingAdmins] = await connection.query('SELECT id FROM admins WHERE username = ?', [username])
    if ((existingAdmins as unknown[]).length === 0) {
      const passwordHash = await bcrypt.hash(password, 10)
      await connection.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, passwordHash])
      console.log(`Admin "${username}" criado.`)
    } else {
      console.log(`Admin "${username}" já existe, pulando.`)
    }

    const [existingPosts] = await connection.query('SELECT COUNT(*) AS count FROM posts')
    const postCount = (existingPosts as Array<{ count: number }>)[0].count
    if (postCount === 0) {
      for (const post of SEED_POSTS) {
        await connection.query(
          `INSERT INTO posts (title, excerpt, tag, tag_color, trending, published_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [post.title, post.excerpt, post.tag, post.tag_color, post.trending, post.published_at],
        )
      }
      console.log(`${SEED_POSTS.length} posts iniciais criados.`)
    } else {
      console.log('Já existem posts, pulando seed de posts.')
    }
  } finally {
    connection.release()
    await pool.end()
  }
}

seed().catch((err) => {
  console.error('Falha no seed:', err)
  process.exit(1)
})
