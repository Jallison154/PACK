import { PackLogo } from '../brand/PackLogo'

export function AuthLoadingScreen({ message = 'Restoring session…' }: { message?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bg-primary)]">
      <div className="text-center">
        <PackLogo size="sm" className="mx-auto mb-5" />
        <div className="border-pack-accent mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-t-transparent" />
        <p className="text-pack-text-secondary mt-4 text-sm">{message}</p>
      </div>
    </div>
  )
}
