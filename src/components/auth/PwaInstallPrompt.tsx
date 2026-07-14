import { Share, Smartphone } from 'lucide-react'
import { usePwaInstallPrompt } from '../../hooks/usePwaInstallPrompt'

export function PwaInstallHelpDialog({
  isIos,
  onClose,
  onDontAskAgain,
}: {
  isIos: boolean
  onClose: () => void
  onDontAskAgain?: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="pack-elevated w-full max-w-md rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="ios-install-title"
      >
        <h2 id="ios-install-title" className="text-pack-text text-lg font-semibold">
          Add Pack to Home Screen
        </h2>
        {isIos ? (
          <ol className="text-pack-text-secondary mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed">
            <li>
              Tap the{' '}
              <span className="text-pack-text inline-flex items-center gap-1 font-medium">
                Share <Share className="inline h-3.5 w-3.5" />
              </span>{' '}
              button in Safari.
            </li>
            <li>
              Scroll and tap <span className="text-pack-text font-medium">Add to Home Screen</span>.
            </li>
            <li>
              Tap <span className="text-pack-text font-medium">Add</span> to confirm.
            </li>
          </ol>
        ) : (
          <ol className="text-pack-text-secondary mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed">
            <li>
              Open your browser menu (often{' '}
              <span className="text-pack-text font-medium">⋮</span> or{' '}
              <span className="text-pack-text font-medium">⋾</span>).
            </li>
            <li>
              Tap <span className="text-pack-text font-medium">Install app</span> or{' '}
              <span className="text-pack-text font-medium">Add to Home screen</span>.
            </li>
            <li>Confirm to place Pack on your Home Screen.</li>
          </ol>
        )}
        <p className="text-pack-text-muted mt-4 text-xs leading-relaxed">
          Once installed, open Pack from your Home Screen icon — it runs fullscreen without the
          browser bar.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          {onDontAskAgain && (
            <button
              type="button"
              onClick={onDontAskAgain}
              className="text-pack-text-muted px-3 py-2 text-sm"
            >
              Don’t ask again
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="bg-pack-accent rounded-xl px-3 py-2 text-sm font-medium text-black"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Asks mobile browser users to add Pack to their Home Screen.
 * Hidden when already running as a standalone PWA shortcut.
 */
export function PwaInstallPrompt() {
  const {
    shouldPrompt,
    isIos,
    canNativeInstall,
    showIosHelp,
    setShowIosHelp,
    install,
    dismiss,
  } = usePwaInstallPrompt()

  if (!shouldPrompt && !showIosHelp) return null

  return (
    <>
      {shouldPrompt && (
        <div className="app-notice">
          <div className="app-notice-panel pack-surface flex min-w-0 items-start gap-3 rounded-2xl p-4">
            <Smartphone className="text-pack-accent mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-pack-text text-sm font-medium">Add Pack to your Home Screen?</p>
              <p className="text-pack-text-muted mt-1 text-xs leading-relaxed">
                {canNativeInstall
                  ? 'Open Pack like an app — faster access, fullscreen, and offline-ready.'
                  : 'Save Pack to your Home Screen for quick access like an app.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void install()}
                  className="bg-pack-accent rounded-xl px-3 py-2 text-sm font-medium text-black"
                >
                  {canNativeInstall ? 'Add shortcut' : 'Show me how'}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="text-pack-text-muted hover:text-pack-text-secondary px-3 py-2 text-sm"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showIosHelp && (
        <PwaInstallHelpDialog
          isIos={isIos}
          onClose={() => setShowIosHelp(false)}
          onDontAskAgain={dismiss}
        />
      )}
    </>
  )
}
