export type Workspace = 'work' | 'personal'

export const WORKSPACES: { value: Workspace; label: string; emoji: string }[] = [
  { value: 'work', label: 'Work', emoji: '💼' },
  { value: 'personal', label: 'Personal', emoji: '🏠' },
]

export type WorkRelationshipType =
  | 'client'
  | 'vendor'
  | 'prospect'
  | 'coworker'
  | 'partner'

export type PersonalRelationshipType =
  | 'friend'
  | 'family'
  | 'neighbor'
  | 'acquaintance'
  | 'service_provider'
  | 'other'

export type RelationshipType = WorkRelationshipType | PersonalRelationshipType

export const WORK_RELATIONSHIP_TYPES: { value: WorkRelationshipType; label: string }[] = [
  { value: 'client', label: 'Client' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'coworker', label: 'Coworker' },
  { value: 'partner', label: 'Partner' },
]

export const PERSONAL_RELATIONSHIP_TYPES: {
  value: PersonalRelationshipType
  label: string
}[] = [
  { value: 'friend', label: 'Friend' },
  { value: 'family', label: 'Family' },
  { value: 'neighbor', label: 'Neighbor' },
  { value: 'acquaintance', label: 'Acquaintance' },
  { value: 'service_provider', label: 'Service Provider' },
  { value: 'other', label: 'Other' },
]

export function getRelationshipTypes(workspace: Workspace) {
  return workspace === 'work' ? WORK_RELATIONSHIP_TYPES : PERSONAL_RELATIONSHIP_TYPES
}

export function getRelationshipLabel(type: string | null | undefined): string {
  if (!type) return ''
  const all = [...WORK_RELATIONSHIP_TYPES, ...PERSONAL_RELATIONSHIP_TYPES]
  return all.find((r) => r.value === type)?.label ?? type
}

export interface Household {
  id: string
  name: string
  address: string | null
  sharedNotes: string | null
  pets: string | null
  generalNotes: string | null
  createdAt: string
  syncVersion: number
}

export interface HouseholdInput {
  name: string
  address?: string
  sharedNotes?: string
  pets?: string
  generalNotes?: string
}

export interface Person {
  id: string
  name: string
  workspace: Workspace
  phone: string | null
  email: string | null
  company: string | null
  companyId: string | null
  jobTitle: string | null
  whereMet: string | null
  event: string | null
  city: string | null
  state: string | null
  locationId: string | null
  whereMetPlaceId: string | null
  whereMetLatitude: number | null
  whereMetLongitude: number | null
  whereMetLocationSource: EncounterLocationSource | null
  whereMetLocationAccuracy: number | null
  whereMetCapturedAt: string | null
  whereMetIsApproximate: boolean
  whereMetAreaLabel: string | null
  lastSeenPlaceId: string | null
  dateMet: string | null
  notes: string | null
  relationshipType: RelationshipType | null
  householdId: string | null
  homeAddress: string | null
  workLocation: string | null
  lastSeenAt: string | null
  lastSeenDate: string | null
  lastInteractionNotes: string | null
  profileColor: string
  isFavorite: boolean
  createdAt: string
  updatedAt: string
  syncVersion: number
  deletedAt: string | null
}

export type InteractionType =
  | 'in_person'
  | 'phone_call'
  | 'video_call'
  | 'text'
  | 'email'
  | 'meeting'
  | 'event'
  | 'other'

export const INTERACTION_TYPES: { value: InteractionType; label: string }[] = [
  { value: 'in_person', label: 'In Person' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'video_call', label: 'Video Call' },
  { value: 'text', label: 'Text Message' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
]

export function getInteractionTypeLabel(type: string | null | undefined): string {
  if (!type) return ''
  return INTERACTION_TYPES.find((t) => t.value === type)?.label ?? type
}

export interface Interaction {
  id: string
  personId: string
  date: string
  location: string | null
  placeId: string | null
  interactionType: InteractionType | null
  notes: string | null
  nextFollowUp: string | null
  event: string | null
  createdAt: string
  updatedAt: string
  syncVersion: number
}

export type PlaceCategory =
  | 'work'
  | 'home'
  | 'venue'
  | 'restaurant'
  | 'hotel'
  | 'convention'
  | 'office'
  | 'neighborhood'
  | 'custom'

export const PLACE_CATEGORIES: { value: PlaceCategory; label: string }[] = [
  { value: 'work', label: 'Work' },
  { value: 'home', label: 'Home' },
  { value: 'venue', label: 'Venue' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'convention', label: 'Convention' },
  { value: 'office', label: 'Office' },
  { value: 'neighborhood', label: 'Neighborhood' },
  { value: 'custom', label: 'Custom' },
]

export function getPlaceCategoryLabel(cat: string | null | undefined): string {
  if (!cat) return ''
  return PLACE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat
}

export interface Place {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  category: PlaceCategory | null
  poiCategories: string[]
  brand: string | null
  mapboxId: string | null
  featureType: string | null
  source: PlaceSource | null
  notes: string | null
  isFavorite: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  syncVersion: number
}

export type PlaceSource = 'manual' | 'mapbox' | 'legacy'

export interface PlaceInput {
  name: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  latitude?: number
  longitude?: number
  category?: PlaceCategory
  poiCategories?: string[]
  brand?: string
  mapboxId?: string
  featureType?: string
  source?: PlaceSource
  notes?: string
  isFavorite?: boolean
}

export interface PlaceWithStats extends Place {
  metCount: number
  lastSeenCount: number
  interactionCount: number
  lastInteractionDate: string | null
}

export interface PlaceSearchResult extends Place {
  distanceKm?: number
}

export interface Company {
  id: string
  name: string
  createdAt: string
  syncVersion: number
}

export interface Tag {
  id: string
  name: string
  createdAt: string
  syncVersion: number
}

export type EncounterLocationSource = 'gps' | 'saved_place' | 'search_result'

export type EncounterLocation =
  | {
      kind: 'approximate'
      latitude: number
      longitude: number
      capturedAt: string
      source: 'gps'
      accuracy?: number
      label?: string
    }
  | {
      kind: 'exact'
      placeId: string
      placeName: string
      latitude?: number
      longitude?: number
      source: 'saved_place' | 'search_result'
    }

export interface PersonInput {
  name: string
  workspace?: Workspace
  phone?: string
  email?: string
  company?: string
  jobTitle?: string
  whereMet?: string
  whereMetPlaceId?: string | null
  whereMetLatitude?: number | null
  whereMetLongitude?: number | null
  whereMetLocationSource?: EncounterLocationSource | null
  whereMetLocationAccuracy?: number | null
  whereMetCapturedAt?: string | null
  whereMetIsApproximate?: boolean
  whereMetAreaLabel?: string | null
  event?: string
  city?: string
  state?: string
  dateMet?: string
  notes?: string
  relationshipType?: RelationshipType
  householdId?: string
  homeAddress?: string
  workLocation?: string
  lastSeenAt?: string
  lastSeenPlaceId?: string | null
  lastSeenDate?: string
  lastInteractionNotes?: string
  profileColor?: string
  tags?: string[]
}

export interface InteractionInput {
  personId: string
  date: string
  location?: string
  placeId?: string
  interactionType?: InteractionType
  notes?: string
  event?: string
  tags?: string[]
  nextFollowUp?: string
}

export interface SearchFilters {
  workspace?: Workspace
  company?: string
  location?: string
  tag?: string
  relationshipType?: RelationshipType
  dateFrom?: string
  dateTo?: string
  favoritesOnly?: boolean
}

export interface WorkDashboardStats {
  totalContacts: number
  companies: number
  events: number
  locations: number
  addedThisWeek: number
}

export interface PersonalDashboardStats {
  totalContacts: number
  households: number
  neighborhoods: number
  favorites: number
}

export interface PersonWithTags extends Person {
  tags: string[]
  householdName?: string | null
  whereMetPlaceName?: string | null
  lastSeenPlaceName?: string | null
}

export interface InteractionWithPerson extends Interaction {
  personName: string
  workspace: Workspace
  placeName?: string | null
}

export interface HouseholdWithMembers extends Household {
  memberCount: number
  members: PersonWithTags[]
}
