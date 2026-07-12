/** Neutral avatar palette — no secondary accent colors */
export const PROFILE_COLORS = [
  '#52525b',
  '#71717a',
  '#3f3f46',
  '#78716c',
  '#57534e',
  '#636366',
  '#48484a',
  '#6b6b70',
  '#404040',
  '#5c5c62',
]

export const DEFAULT_PROFILE_COLOR = '#52525b'

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function randomProfileColor(): string {
  return PROFILE_COLORS[Math.floor(Math.random() * PROFILE_COLORS.length)]
}
