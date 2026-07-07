import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-pack-text-secondary block text-sm font-medium">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`pack-inset text-pack-text placeholder:text-pack-text-muted w-full px-4 py-3.5 text-base transition-colors ${error ? 'border-pack-danger' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-pack-danger text-sm">{error}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function Textarea({ label, className = '', id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-pack-text-secondary block text-sm font-medium">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`pack-inset text-pack-text placeholder:text-pack-text-muted w-full resize-none px-4 py-3.5 text-base transition-colors ${className}`}
        rows={3}
        {...props}
      />
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export function Select({ label, options, className = '', id, ...props }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-pack-text-secondary block text-sm font-medium">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={`pack-inset text-pack-text w-full appearance-none px-4 py-3.5 text-base transition-colors ${className}`}
        {...props}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
