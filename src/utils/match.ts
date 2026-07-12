export type MatchStrength = 'strong' | 'likely' | 'possible'

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function namesSimilar(a: string, b: string): boolean {
  const na = a.toLowerCase().trim()
  const nb = b.toLowerCase().trim()
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) return true
  const firstA = na.split(/\s+/)[0]
  const firstB = nb.split(/\s+/)[0]
  if (firstA.length >= 3 && firstA === firstB) return true
  return false
}

export function textSimilar(a: string, b: string): boolean {
  const na = a.toLowerCase().trim()
  const nb = b.toLowerCase().trim()
  if (!na || !nb) return false
  return na === nb || na.includes(nb) || nb.includes(na)
}

export const STRENGTH_ORDER: Record<MatchStrength, number> = {
  strong: 3,
  likely: 2,
  possible: 1,
}
