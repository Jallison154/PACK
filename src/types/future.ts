/**
 * Future feature interfaces — architecture prepared for extension.
 * These types define the data contracts for upcoming capabilities.
 */

export interface Attachment {
  id: string
  personId: string
  interactionId?: string
  type: 'photo' | 'voice' | 'business_card'
  mimeType: string
  filePath: string
  thumbnailPath?: string
  createdAt: string
  syncVersion: number
}

export interface BusinessCardScan {
  id: string
  personId?: string
  rawImagePath: string
  ocrText?: string
  parsedFields?: {
    name?: string
    phone?: string
    email?: string
    company?: string
    jobTitle?: string
  }
  status: 'pending' | 'processed' | 'failed'
  createdAt: string
}

export interface VoiceNote {
  id: string
  personId: string
  interactionId?: string
  audioPath: string
  durationSeconds: number
  transcription?: string
  summary?: string
  createdAt: string
}

export interface FollowUpReminder {
  id: string
  personId: string
  interactionId?: string
  dueDate: string
  message: string
  completed: boolean
  notified: boolean
  createdAt: string
}

export interface GeoLocation {
  id: string
  personId: string
  latitude: number
  longitude: number
  label?: string
  createdAt: string
}

export interface SyncRecord {
  table: string
  recordId: string
  operation: 'insert' | 'update' | 'delete'
  payload: string
  syncVersion: number
  syncedAt?: string
  deviceId: string
}

export interface SharedDatabase {
  id: string
  name: string
  ownerId: string
  memberIds: string[]
  createdAt: string
}

export interface AISummary {
  id: string
  personId: string
  interactionId?: string
  originalText: string
  summary: string
  createdAt: string
}

/** Reserved table names for future migrations */
export const FUTURE_TABLES = [
  'attachments',
  'business_card_scans',
  'voice_notes',
  'follow_up_reminders',
  'geo_locations',
  'sync_queue',
  'shared_databases',
  'ai_summaries',
] as const
