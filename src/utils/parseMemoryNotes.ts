import { format, parse, subDays, isValid } from 'date-fns'

export interface ParsedMemoryNotes {
  notes: string
  phone?: string
  email?: string
  url?: string
  company?: string
  whereMet?: string
  dateMet?: string
}

const PHONE_RE =
  /\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const URL_RE = /\b(?:https?:\/\/|www\.)\S+\b/i

function extractDate(text: string): string | undefined {
  const lower = text.toLowerCase()
  if (/\byesterday\b/.test(lower)) return format(subDays(new Date(), 1), 'yyyy-MM-dd')
  if (/\btoday\b/.test(lower)) return format(new Date(), 'yyyy-MM-dd')

  const slash = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (slash) {
    const year = slash[3]
      ? slash[3].length === 2
        ? `20${slash[3]}`
        : slash[3]
      : String(new Date().getFullYear())
    const parsed = parse(`${slash[1]}/${slash[2]}/${year}`, 'M/d/yyyy', new Date())
    if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd')
  }

  return undefined
}

function findKnownMatch(text: string, known: string[]): string | undefined {
  const lower = text.toLowerCase()
  const sorted = [...known].sort((a, b) => b.length - a.length)
  return sorted.find((item) => item.length >= 2 && lower.includes(item.toLowerCase()))
}

export function parseMemoryNotes(
  memory: string,
  knownCompanies: string[] = [],
  knownPlaces: string[] = [],
): ParsedMemoryNotes {
  const notes = memory.trim()
  if (!notes) return { notes: '' }

  const phone = notes.match(PHONE_RE)?.[0]
  const email = notes.match(EMAIL_RE)?.[0]
  const url = notes.match(URL_RE)?.[0]
  const company = findKnownMatch(notes, knownCompanies)
  const whereMet = findKnownMatch(
    notes,
    knownPlaces.filter((p) => p.toLowerCase() !== company?.toLowerCase()),
  )
  const dateMet = extractDate(notes)

  return {
    notes,
    phone,
    email,
    url,
    company,
    whereMet,
    dateMet,
  }
}

export function getRecognizedLabels(parsed: ParsedMemoryNotes): string[] {
  const labels: string[] = []
  if (parsed.company) labels.push(parsed.company)
  if (parsed.whereMet) labels.push(parsed.whereMet)
  if (parsed.phone) labels.push('Phone')
  if (parsed.email) labels.push('Email')
  if (parsed.url) labels.push('Link')
  if (parsed.dateMet) labels.push('Date')
  return labels
}
