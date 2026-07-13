import { v4 as uuid } from 'uuid'

let activeSessionToken = uuid()

export function getMapboxSearchSessionToken(): string {
  return activeSessionToken
}

export function resetMapboxSearchSession(): void {
  activeSessionToken = uuid()
}
