// Número usado nos CTAs estáticos "Falar no WhatsApp" (Hero, Sobre, Serviços)
// e no link que o ChatWidget manda quando a IA precisa escalar a conversa
// para um humano.
export const WHATSAPP_NUMBER = '5516988190586'

export function waLink(text?: string | null): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
