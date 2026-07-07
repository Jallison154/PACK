import type { PersonWithTags } from '../types'

export interface LetterGroup {
  letter: string
  people: PersonWithTags[]
}

export function groupByLetter(people: PersonWithTags[]): LetterGroup[] {
  const groups = new Map<string, PersonWithTags[]>()

  for (const person of people) {
    const first = person.name.trim().charAt(0).toUpperCase()
    const letter = /[A-Z]/.test(first) ? first : '#'
    const list = groups.get(letter) ?? []
    list.push(person)
    groups.set(letter, list)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === '#') return 1
      if (b === '#') return -1
      return a.localeCompare(b)
    })
    .map(([letter, members]) => ({
      letter,
      people: members.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    }))
}
