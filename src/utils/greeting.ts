export function getGreeting(name?: string | null): string {
  const hour = new Date().getHours()
  let base: string
  if (hour < 12) base = 'Good Morning'
  else if (hour < 17) base = 'Good Afternoon'
  else if (hour >= 20) base = 'Welcome back'
  else base = 'Good Evening'

  const trimmed = name?.trim()
  return trimmed ? `${base}, ${trimmed}` : base
}
