import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'

export function SettingsGroupRow({
  title,
  subtitle,
  icon: Icon,
  onClick,
  active,
  secondary,
}: {
  title: string
  subtitle: string
  icon: LucideIcon
  onClick: () => void
  active?: boolean
  secondary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`hover:bg-pack-card-hover/60 flex w-full items-center gap-4 rounded-xl px-2 py-3.5 text-left transition-colors ${
        active ? 'bg-pack-card-hover/40' : ''
      } ${secondary ? 'opacity-85' : ''}`}
    >
      <div className="bg-pack-accent-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
        <Icon className="text-pack-accent h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug font-medium">{title}</p>
        <p className="text-pack-text-muted mt-0.5 text-sm leading-relaxed">{subtitle}</p>
      </div>
      <ChevronRight className="text-pack-text-muted/50 h-5 w-5 shrink-0" />
    </button>
  )
}

export function SettingsSubpageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="pack-nav page-nav-top page-px sticky top-0 z-20 flex items-center gap-3 border-b">
      <button
        type="button"
        onClick={onBack}
        className="text-pack-text-secondary hover:text-pack-text -ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors"
        aria-label="Back to Settings"
      >
        <ChevronRight className="h-6 w-6 rotate-180" />
      </button>
      <h1 className="truncate text-xl font-bold">{title}</h1>
    </header>
  )
}

export function SettingsDetailCard({ children }: { children: ReactNode }) {
  return (
    <Card>
      <div className="divide-pack-border divide-y">{children}</div>
    </Card>
  )
}

export function SettingsSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Card>
      <h3 className="text-pack-text-muted/80 mb-1 text-[13px] font-medium tracking-wide">
        {title}
      </h3>
      <div className="divide-pack-border divide-y">{children}</div>
    </Card>
  )
}

export function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      aria-pressed={enabled}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        enabled ? 'bg-pack-accent' : 'bg-pack-border'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-5' : ''
        }`}
      />
    </button>
  )
}

export function ToggleRow({
  label,
  description,
  enabled,
  onChange,
  disabled,
  comingSoon,
}: {
  label: string
  description?: string
  enabled: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  comingSoon?: boolean
}) {
  const isDisabled = disabled || comingSoon

  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug font-medium">{label}</p>
        {description && (
          <p className="text-pack-text-muted mt-0.5 text-sm leading-relaxed">{description}</p>
        )}
        {comingSoon && (
          <p className="text-pack-text-muted/60 mt-1 text-xs">Coming soon</p>
        )}
      </div>
      <Toggle enabled={enabled} onChange={onChange} disabled={isDisabled} />
    </div>
  )
}

export function InfoRow({
  label,
  value,
  description,
}: {
  label: string
  value: ReactNode
  description?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug font-medium">{label}</p>
        {description && (
          <p className="text-pack-text-muted mt-0.5 text-sm leading-relaxed">{description}</p>
        )}
      </div>
      <span className="text-pack-text-secondary shrink-0 text-sm">{value}</span>
    </div>
  )
}

export function ActionRow({
  label,
  description,
  action,
  comingSoon,
  destructive,
}: {
  label: string
  description?: string
  action: ReactNode
  comingSoon?: boolean
  destructive?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p
          className={`text-[15px] leading-snug font-medium ${destructive ? 'text-pack-danger' : ''}`}
        >
          {label}
        </p>
        {description && (
          <p className="text-pack-text-muted mt-0.5 text-sm leading-relaxed">{description}</p>
        )}
        {comingSoon && (
          <p className="text-pack-text-muted/60 mt-1 text-xs">Coming soon</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function SegmentPicker<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <div
      className={`bg-pack-card border-pack-border inline-flex rounded-xl border p-1 ${
        disabled ? 'pointer-events-none opacity-40' : ''
      }`}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            value === opt.value
              ? 'bg-pack-accent text-black'
              : 'text-pack-text-muted hover:text-pack-text-secondary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <Card padding="sm" className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="hover:bg-pack-card-hover/50 flex w-full items-center justify-between gap-3 rounded-xl px-2 py-3 text-left transition-colors"
      >
        <span className="text-pack-text-muted/80 text-[13px] font-medium tracking-wide">
          {title}
        </span>
        <ChevronDown
          className={`text-pack-text-muted h-4 w-4 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && <div className="divide-pack-border border-pack-border border-t px-2">{children}</div>}
    </Card>
  )
}

export function LinkButton({
  href,
  children,
  external,
  onClick,
}: {
  href?: string
  children: ReactNode
  external?: boolean
  onClick?: () => void
}) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-pack-text-secondary hover:text-pack-text text-sm font-medium transition-colors"
      >
        {children}
      </button>
    )
  }

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="text-pack-text-secondary hover:text-pack-text text-sm font-medium transition-colors"
    >
      {children}
    </a>
  )
}

export function SettingsButton({
  onClick,
  children,
  variant = 'secondary',
  loading,
  disabled,
}: {
  onClick?: () => void
  children: ReactNode
  variant?: 'secondary' | 'danger'
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <Button
      variant={variant === 'danger' ? 'danger' : 'secondary'}
      size="sm"
      onClick={onClick}
      loading={loading}
      disabled={disabled}
    >
      {children}
    </Button>
  )
}
