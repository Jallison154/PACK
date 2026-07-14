import { v4 as uuid } from 'uuid'
import { db, rowToPerson, rowToInteraction } from '../database'
import { distanceKm } from '../../utils/geo'
import {
  buildNearbyContextLabel,
  nearbyEventName,
  nearbyOccurredAt,
  type NearbyPersonMatchKind,
} from '../../utils/nearbyPersonContext'
import type { MapboxPlaceResult } from '../../services/mapbox/types'
import type {
  Place,
  PlaceInput,
  PlaceWithStats,
  PlaceSearchResult,
  PersonWithTags,
  InteractionWithPerson,
  PlaceCategory,
} from '../../types'

export type { NearbyPersonMatchKind } from '../../utils/nearbyPersonContext'

function normalizePlaceName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function serializePoiCategories(categories?: string[]): string | null {
  if (!categories?.length) return null
  return JSON.stringify(categories)
}

function parsePoiCategories(raw: unknown): string[] {
  if (!raw || typeof raw !== 'string') return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

async function enrichPersonRow(row: Record<string, unknown>): Promise<PersonWithTags> {
  const person = rowToPerson(row)
  const tagRows = await db.query<{ name: string }>(
    `SELECT t.name FROM tags t JOIN person_tags pt ON t.id = pt.tag_id WHERE pt.person_id = ?`,
    [person.id],
  )
  return { ...person, tags: tagRows.map((t) => t.name) }
}

export function rowToPlace(row: Record<string, unknown>): Place {
  return {
    id: row.id as string,
    name: row.name as string,
    address: (row.address as string) || null,
    city: (row.city as string) || null,
    state: (row.state as string) || null,
    postalCode: (row.postal_code as string) || null,
    country: (row.country as string) || null,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    category: (row.category as PlaceCategory) || null,
    poiCategories: parsePoiCategories(row.poi_categories),
    brand: (row.brand as string) || null,
    mapboxId: (row.mapbox_id as string) || null,
    featureType: (row.feature_type as string) || null,
    source: (row.source as Place['source']) || 'manual',
    notes: (row.notes as string) || null,
    isFavorite: Boolean(row.is_favorite),
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) || (row.created_at as string),
    deletedAt: (row.deleted_at as string) || null,
    syncVersion: (row.sync_version as number) || 1,
  }
}

function mapboxResultToInput(result: MapboxPlaceResult): PlaceInput {
  return {
    name: result.name,
    address: result.address ?? result.fullAddress ?? undefined,
    city: result.city ?? undefined,
    state: result.region ?? undefined,
    postalCode: result.postalCode ?? undefined,
    country: result.country ?? undefined,
    latitude: result.latitude,
    longitude: result.longitude,
    category: (result.category as PlaceCategory) || undefined,
    poiCategories: result.poiCategories,
    brand: result.brand ?? undefined,
    mapboxId: result.mapboxId,
    featureType: result.featureType,
    source: 'mapbox',
  }
}

const ACTIVE_PLACES = 'deleted_at IS NULL'

export async function findPlaceByMapboxId(mapboxId: string): Promise<Place | null> {
  const rows = await db.query(
    `SELECT * FROM places WHERE mapbox_id = ? AND ${ACTIVE_PLACES} LIMIT 1`,
    [mapboxId],
  )
  return rows[0] ? rowToPlace(rows[0]) : null
}

export async function findPlaceByProximityAndName(
  latitude: number,
  longitude: number,
  name: string,
  maxMeters = 75,
): Promise<Place | null> {
  const rows = await db.query(
    `SELECT * FROM places WHERE ${ACTIVE_PLACES} AND latitude IS NOT NULL AND longitude IS NOT NULL`,
  )

  const normalized = normalizePlaceName(name)
  for (const row of rows) {
    const place = rowToPlace(row)
    if (normalizePlaceName(place.name) !== normalized) continue
    const km = distanceKm(latitude, longitude, place.latitude!, place.longitude!)
    if (km * 1000 <= maxMeters) return place
  }

  return null
}

export async function findOrCreatePlaceFromMapbox(result: MapboxPlaceResult): Promise<Place> {
  const byId = await findPlaceByMapboxId(result.mapboxId)
  if (byId) return byId

  const byProximity = await findPlaceByProximityAndName(
    result.latitude,
    result.longitude,
    result.name,
  )
  if (byProximity) {
    if (!byProximity.mapboxId) {
      return updatePlace(byProximity.id, {
        ...mapboxResultToInput(result),
        isFavorite: byProximity.isFavorite,
        notes: byProximity.notes ?? undefined,
      })
    }
    return byProximity
  }

  return createPlace(mapboxResultToInput(result))
}

export async function createPlace(input: PlaceInput): Promise<Place> {
  const id = uuid()
  const now = new Date().toISOString()
  await db.run(
    `INSERT INTO places (
      id, name, address, city, state, postal_code, country, latitude, longitude,
      category, poi_categories, brand, mapbox_id, feature_type, source,
      notes, is_favorite, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.address ?? null,
      input.city ?? null,
      input.state ?? null,
      input.postalCode ?? null,
      input.country ?? null,
      input.latitude ?? null,
      input.longitude ?? null,
      input.category ?? null,
      serializePoiCategories(input.poiCategories),
      input.brand ?? null,
      input.mapboxId ?? null,
      input.featureType ?? null,
      input.source ?? 'manual',
      input.notes ?? null,
      input.isFavorite ? 1 : 0,
      now,
      now,
    ],
  )
  const rows = await db.query('SELECT * FROM places WHERE id = ?', [id])
  return rowToPlace(rows[0])
}

export async function updatePlace(id: string, input: PlaceInput): Promise<Place> {
  const now = new Date().toISOString()
  await db.run(
    `UPDATE places SET
      name = ?, address = ?, city = ?, state = ?, postal_code = ?, country = ?,
      latitude = ?, longitude = ?, category = ?, poi_categories = ?, brand = ?,
      mapbox_id = ?, feature_type = ?, source = ?, notes = ?, is_favorite = ?, updated_at = ?
     WHERE id = ? AND ${ACTIVE_PLACES}`,
    [
      input.name,
      input.address ?? null,
      input.city ?? null,
      input.state ?? null,
      input.postalCode ?? null,
      input.country ?? null,
      input.latitude ?? null,
      input.longitude ?? null,
      input.category ?? null,
      serializePoiCategories(input.poiCategories),
      input.brand ?? null,
      input.mapboxId ?? null,
      input.featureType ?? null,
      input.source ?? 'manual',
      input.notes ?? null,
      input.isFavorite ? 1 : 0,
      now,
      id,
    ],
  )
  const rows = await db.query(`SELECT * FROM places WHERE id = ? AND ${ACTIVE_PLACES}`, [id])
  return rowToPlace(rows[0])
}

export async function deletePlace(id: string): Promise<void> {
  const now = new Date().toISOString()
  await db.run(`UPDATE places SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id])
}

export async function getPlaceById(id: string): Promise<Place | null> {
  const rows = await db.query(`SELECT * FROM places WHERE id = ? AND ${ACTIVE_PLACES}`, [id])
  if (rows.length === 0) return null
  return rowToPlace(rows[0])
}

export async function upsertPlaceByName(
  name: string,
  city?: string,
  state?: string,
  category?: PlaceCategory,
): Promise<string> {
  const existing = await db.query<{ id: string }>(
    `SELECT id FROM places WHERE LOWER(name) = LOWER(?) AND ${ACTIVE_PLACES}`,
    [name],
  )
  if (existing.length > 0) return existing[0].id

  const place = await createPlace({ name, city, state, category, source: 'legacy' })
  return place.id
}

export async function togglePlaceFavorite(id: string): Promise<boolean> {
  const rows = await db.query<{ is_favorite: number }>(
    'SELECT is_favorite FROM places WHERE id = ?',
    [id],
  )
  if (rows.length === 0) return false
  const newVal = rows[0].is_favorite ? 0 : 1
  await db.run('UPDATE places SET is_favorite = ? WHERE id = ?', [newVal, id])
  return Boolean(newVal)
}

export async function getAllPlaces(): Promise<PlaceWithStats[]> {
  const rows = await db.query(`SELECT * FROM places WHERE ${ACTIVE_PLACES} ORDER BY name ASC`)
  const places: PlaceWithStats[] = []
  for (const row of rows) {
    places.push({ ...(await getPlaceStats(rowToPlace(row).id))! })
  }
  return places.filter(Boolean)
}

export async function getPlaceStats(id: string): Promise<PlaceWithStats | null> {
  const place = await getPlaceById(id)
  if (!place) return null

  const [met, lastSeen, interactions] = await Promise.all([
    db.query<{ count: number }>(
      `SELECT COUNT(DISTINCT id) as count FROM people
       WHERE deleted_at IS NULL AND (where_met_place_id = ? OR location_id = ?)`,
      [id, id],
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(DISTINCT id) as count FROM people
       WHERE deleted_at IS NULL AND last_seen_place_id = ?`,
      [id],
    ),
    db.query<{ count: number; last_date: string | null }>(
      `SELECT COUNT(*) as count, MAX(date) as last_date FROM interactions WHERE place_id = ?`,
      [id],
    ),
  ])

  return {
    ...place,
    metCount: met[0]?.count ?? 0,
    lastSeenCount: lastSeen[0]?.count ?? 0,
    interactionCount: interactions[0]?.count ?? 0,
    lastInteractionDate: interactions[0]?.last_date ?? null,
  }
}

export async function getPlacesWithCoordinates(): Promise<PlaceWithStats[]> {
  const rows = await db.query(
    `SELECT * FROM places WHERE ${ACTIVE_PLACES} AND latitude IS NOT NULL AND longitude IS NOT NULL`,
  )
  const places: PlaceWithStats[] = []
  for (const row of rows) {
    const stats = await getPlaceStats(rowToPlace(row).id)
    if (stats) places.push(stats)
  }
  return places
}

export async function getFavoritePlaces(): Promise<Place[]> {
  const rows = await db.query(
    `SELECT * FROM places WHERE is_favorite = 1 AND ${ACTIVE_PLACES} ORDER BY name`,
  )
  return rows.map(rowToPlace)
}

export async function getRecentPlaces(limit = 10): Promise<Place[]> {
  const rows = await db.query(
    `SELECT DISTINCT p.* FROM places p
     LEFT JOIN interactions i ON i.place_id = p.id
     LEFT JOIN people pe ON pe.last_seen_place_id = p.id
     WHERE p.${ACTIVE_PLACES}
     ORDER BY COALESCE(i.created_at, pe.updated_at, p.created_at) DESC
     LIMIT ?`,
    [limit],
  )
  return rows.map(rowToPlace)
}

export async function getSavedPlaces(limit = 30): Promise<Place[]> {
  const rows = await db.query(
    `SELECT * FROM places WHERE ${ACTIVE_PLACES} ORDER BY updated_at DESC, name ASC LIMIT ?`,
    [limit],
  )
  return rows.map(rowToPlace)
}

export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const like = `%${query.trim()}%`
  if (!query.trim()) {
    const rows = await db.query(`SELECT * FROM places WHERE ${ACTIVE_PLACES} ORDER BY name LIMIT 20`)
    return rows.map(rowToPlace)
  }
  const rows = await db.query(
    `SELECT DISTINCT p.* FROM places p
     LEFT JOIN people pe_met ON pe_met.where_met_place_id = p.id AND pe_met.deleted_at IS NULL
     LEFT JOIN people pe_seen ON pe_seen.last_seen_place_id = p.id AND pe_seen.deleted_at IS NULL
     WHERE p.${ACTIVE_PLACES} AND (
     p.name LIKE ? OR p.address LIKE ? OR p.city LIKE ? OR p.state LIKE ? OR
     p.category LIKE ? OR p.notes LIKE ? OR
     pe_met.name LIKE ? OR pe_seen.name LIKE ?
     ) ORDER BY p.name LIMIT 30`,
    [like, like, like, like, like, like, like, like],
  )
  return rows.map(rowToPlace)
}

/** Saved Pack places sorted by distance — for map overlays, not the Nearby picker tab. */
export async function getNearbySavedPlaces(
  lat: number,
  lng: number,
  limit = 10,
): Promise<PlaceSearchResult[]> {
  const rows = await db.query(
    `SELECT * FROM places WHERE ${ACTIVE_PLACES} AND latitude IS NOT NULL AND longitude IS NOT NULL`,
  )
  const withDistance = rows
    .map((row) => {
      const place = rowToPlace(row)
      return {
        ...place,
        distanceKm: distanceKm(lat, lng, place.latitude!, place.longitude!),
      }
    })
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
    .slice(0, limit)

  return withDistance
}

/** @deprecated Nearby tab now uses Mapbox POIs — use getNearbySavedPlaces for saved-place distance. */
export const getNearbyPlaces = getNearbySavedPlaces

export async function getPeopleMetAtPlace(placeId: string): Promise<PersonWithTags[]> {
  const rows = await db.query(
    `SELECT * FROM people WHERE deleted_at IS NULL
     AND (where_met_place_id = ? OR location_id = ?)
     ORDER BY name ASC`,
    [placeId, placeId],
  )
  const people: PersonWithTags[] = []
  for (const row of rows) {
    people.push(await enrichPersonRow(row))
  }
  return people
}

export async function getPeopleLastSeenAtPlace(placeId: string): Promise<PersonWithTags[]> {
  const rows = await db.query(
    `SELECT DISTINCT p.* FROM people p
     LEFT JOIN interactions i ON i.person_id = p.id AND i.place_id = ?
     WHERE p.deleted_at IS NULL AND (p.last_seen_place_id = ? OR i.place_id = ?)
     ORDER BY p.name ASC`,
    [placeId, placeId, placeId],
  )
  const people: PersonWithTags[] = []
  for (const row of rows) {
    people.push(await enrichPersonRow(row))
  }
  return people
}

export interface NearbyPersonResult {
  person: PersonWithTags
  matchKind: NearbyPersonMatchKind
  place: Place | null
  distanceMeters: number
  /** Place / event / relative time, e.g. "Met at Pub Station · SXSW · 3 months ago" */
  contextLabel: string
  eventName: string | null
  occurredAt: string | null
}

const NEARBY_RADIUS_METERS_DEFAULT = 200

async function latestInteractionAtPlace(
  placeId: string,
): Promise<Map<string, { date: string | null; event: string | null }>> {
  const rows = await db.query(
    `SELECT person_id, date, event FROM interactions
     WHERE place_id = ?
     ORDER BY date DESC`,
    [placeId],
  )
  const byPerson = new Map<string, { date: string | null; event: string | null }>()
  for (const row of rows) {
    const personId = row.person_id as string
    if (byPerson.has(personId)) continue
    byPerson.set(personId, {
      date: (row.date as string) || null,
      event: (row.event as string) || null,
    })
  }
  return byPerson
}

function toNearbyResult(input: {
  person: PersonWithTags
  matchKind: NearbyPersonMatchKind
  place: Place | null
  distanceMeters: number
  areaLabel?: string | null
  interactionDate?: string | null
  interactionEvent?: string | null
}): NearbyPersonResult {
  const eventName = nearbyEventName(input.person, input.interactionEvent)
  const occurredAt = nearbyOccurredAt(input.person, input.matchKind, input.interactionDate)
  return {
    person: input.person,
    matchKind: input.matchKind,
    place: input.place,
    distanceMeters: input.distanceMeters,
    eventName,
    occurredAt,
    contextLabel: buildNearbyContextLabel({
      matchKind: input.matchKind,
      placeName: input.place?.name,
      areaLabel: input.areaLabel,
      eventName,
      occurredAt,
    }),
  }
}

/**
 * People you've met (or last seen) near the current GPS position.
 * Matches saved places within radius, plus approximate GPS "where met" points.
 */
export async function getPeopleNearLocation(
  lat: number,
  lng: number,
  options?: { radiusMeters?: number; includeLastSeen?: boolean; limit?: number },
): Promise<NearbyPersonResult[]> {
  const radiusMeters = options?.radiusMeters ?? NEARBY_RADIUS_METERS_DEFAULT
  const includeLastSeen = options?.includeLastSeen ?? true
  const limit = options?.limit ?? 12
  const radiusKm = radiusMeters / 1000

  const byPersonId = new Map<string, NearbyPersonResult>()

  const rank: Record<NearbyPersonMatchKind, number> = {
    met_at_place: 0,
    last_seen_at_place: 1,
    approximate_gps: 2,
  }

  const consider = (next: NearbyPersonResult) => {
    const existing = byPersonId.get(next.person.id)
    if (!existing) {
      byPersonId.set(next.person.id, next)
      return
    }
    const betterKind = rank[next.matchKind] < rank[existing.matchKind]
    const closer =
      rank[next.matchKind] === rank[existing.matchKind] &&
      next.distanceMeters < existing.distanceMeters
    if (betterKind || closer) byPersonId.set(next.person.id, next)
  }

  const nearbyPlaces = (await getNearbySavedPlaces(lat, lng, 40)).filter(
    (place) => (place.distanceKm ?? Infinity) <= radiusKm,
  )

  for (const place of nearbyPlaces) {
    const distanceMeters = Math.round((place.distanceKm ?? 0) * 1000)
    const interactionsByPerson = await latestInteractionAtPlace(place.id)
    const met = await getPeopleMetAtPlace(place.id)
    for (const person of met) {
      const interaction = interactionsByPerson.get(person.id)
      consider(
        toNearbyResult({
          person,
          matchKind: 'met_at_place',
          place,
          distanceMeters,
          interactionDate: interaction?.date,
          interactionEvent: interaction?.event,
        }),
      )
    }
    if (includeLastSeen) {
      const seen = await getPeopleLastSeenAtPlace(place.id)
      for (const person of seen) {
        const interaction = interactionsByPerson.get(person.id)
        consider(
          toNearbyResult({
            person,
            matchKind: 'last_seen_at_place',
            place,
            distanceMeters,
            interactionDate: interaction?.date,
            interactionEvent: interaction?.event,
          }),
        )
      }
    }
  }

  const approxRows = await db.query(
    `SELECT * FROM people
     WHERE deleted_at IS NULL
       AND where_met_is_approximate = 1
       AND where_met_latitude IS NOT NULL
       AND where_met_longitude IS NOT NULL`,
  )

  for (const row of approxRows) {
    const personLat = Number(row.where_met_latitude)
    const personLng = Number(row.where_met_longitude)
    if (!Number.isFinite(personLat) || !Number.isFinite(personLng)) continue
    const km = distanceKm(lat, lng, personLat, personLng)
    if (km > radiusKm) continue
    const person = await enrichPersonRow(row)
    const area = (row.where_met_area_label as string | null) || person.whereMet || 'nearby'
    consider(
      toNearbyResult({
        person,
        matchKind: 'approximate_gps',
        place: null,
        distanceMeters: Math.round(km * 1000),
        areaLabel: area,
      }),
    )
  }

  return [...byPersonId.values()]
    .sort((a, b) => a.distanceMeters - b.distanceMeters || a.person.name.localeCompare(b.person.name))
    .slice(0, limit)
}

export async function getInteractionsAtPlace(placeId: string): Promise<InteractionWithPerson[]> {
  const rows = await db.query(
    `SELECT i.*, pe.name as person_name, pe.workspace, pl.name as place_name
     FROM interactions i
     JOIN people pe ON pe.id = i.person_id
     LEFT JOIN places pl ON pl.id = i.place_id
     WHERE i.place_id = ? AND pe.deleted_at IS NULL
     ORDER BY i.date DESC`,
    [placeId],
  )
  return rows.map((row) => ({
    ...rowToInteraction(row),
    personName: row.person_name as string,
    workspace: row.workspace as never,
    placeName: (row.place_name as string) || null,
  }))
}

export async function getAllPlaceNames(): Promise<string[]> {
  const rows = await db.query<{ name: string }>(
    `SELECT name FROM places WHERE ${ACTIVE_PLACES} ORDER BY name`,
  )
  return rows.map((r) => r.name)
}
