export const PROFILE_COLORS = [
  '#F7941D',
  '#3B82F6',
  '#22C55E',
  '#A855F7',
  '#EC4899',
  '#14B8A6',
  '#F59E0B',
  '#6366F1',
  '#EF4444',
  '#06B6D4',
]

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
