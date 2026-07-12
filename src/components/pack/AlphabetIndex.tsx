interface AlphabetIndexProps {
  letters: string[]
  onSelect: (letter: string) => void
}

export function AlphabetIndex({ letters, onSelect }: AlphabetIndexProps) {
  if (letters.length < 4) return null

  return (
    <div className="fixed top-1/2 right-1 z-20 flex -translate-y-1/2 flex-col items-center gap-0.5 py-2">
      {letters.map((letter) => (
        <button
          key={letter}
          type="button"
          onClick={() => onSelect(letter)}
          className="text-pack-accent hover:text-pack-text w-4 text-[10px] font-semibold leading-none"
        >
          {letter}
        </button>
      ))}
    </div>
  )
}
