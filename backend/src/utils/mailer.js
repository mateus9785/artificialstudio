import nodemailer from 'nodemailer'

let transporter

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return transporter
}

export async function sendPasswordResetEmail(to, resetUrl) {
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Redefinição de senha — Artificial Studio Parceiros',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Redefinir senha</h2>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta de parceiro.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#0891b2;color:#fff;text-decoration:none;">
            Redefinir minha senha
          </a>
        </p>
        <p>Este link expira em 1 hora. Se você não solicitou isso, pode ignorar este e-mail.</p>
      </div>
    `,
  })
}
