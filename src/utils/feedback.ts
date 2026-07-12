const FEEDBACK_EMAIL = 'contact@okamidesigns.com'

function buildFeedbackMailto(appVersion: string): string {
  const subject = encodeURIComponent('Pack Feedback')
  const body = encodeURIComponent(
    `Hi Okami Designs,

I'd like to share the following feedback about Pack:

----------------------------------------

(Optional)
Device: ${navigator.userAgent}
App Version: ${appVersion}
Steps to reproduce:
Suggestions:

----------------------------------------

Thank you for building Pack!`,
  )
  return `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`
}

function showFeedbackFallback(): void {
  window.alert(
    `No email app was detected on this device.\n\nPlease send your feedback to:\n${FEEDBACK_EMAIL}`,
  )
}

/** Opens the default mail client for Pack feedback, with a fallback if unavailable. */
export function openPackFeedbackEmail(appVersion: string): void {
  const mailto = buildFeedbackMailto(appVersion)

  let likelyOpened = false
  const markOpened = () => {
    likelyOpened = true
  }

  window.addEventListener('blur', markOpened, { once: true })
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState === 'hidden') likelyOpened = true
    },
    { once: true },
  )

  window.location.href = mailto

  window.setTimeout(() => {
    window.removeEventListener('blur', markOpened)
    if (!likelyOpened && document.visibilityState === 'visible') {
      showFeedbackFallback()
    }
  }, 750)
}

export { FEEDBACK_EMAIL }
