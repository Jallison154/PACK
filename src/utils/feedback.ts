const FEEDBACK_EMAIL = 'contact@okamidesigns.com'
const FEATURE_REQUEST_EMAIL = 'info@okamidesigns.com'

function openMailto(
  email: string,
  subject: string,
  body: string,
  fallbackLabel: string,
): void {
  const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

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
      window.alert(
        `No email app was detected on this device.\n\nPlease send your ${fallbackLabel} to:\n${email}`,
      )
    }
  }, 750)
}

/** Opens the default mail client for Pack feedback, with a fallback if unavailable. */
export function openPackFeedbackEmail(appVersion: string): void {
  openMailto(
    FEEDBACK_EMAIL,
    'Pack Feedback',
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
    'feedback',
  )
}

/** Opens the default mail client for a Pack feature request. */
export function openPackFeatureRequestEmail(appVersion: string): void {
  openMailto(
    FEATURE_REQUEST_EMAIL,
    'Pack Feature Request',
    `Hi Okami Designs,

I'd like to request a feature for Pack:

----------------------------------------

Feature idea:


Why it would help:


(Optional)
Device: ${navigator.userAgent}
App Version: ${appVersion}

----------------------------------------

Thank you!`,
    'feature request',
  )
}

export { FEEDBACK_EMAIL, FEATURE_REQUEST_EMAIL }

