// Número usado nos CTAs "Falar no WhatsApp" (Hero, Sobre, Serviços) e no
// botão flutuante do canto da tela (WhatsAppButton), que substituiu o antigo
// ChatWidget — o atendimento agora acontece no WhatsApp real.
export const WHATSAPP_NUMBER = '5516988190586'

export function waLink(text?: string | null): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
