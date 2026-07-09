export interface GeocodeResult {
  osmId: string
  name: string
  displayName: string
  address: string | null
  city: string | null
  state: string | null
  latitude: number
  longitude: number
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const USER_AGENT = 'PackApp/1.0 (personal CRM; contact@okamidesigns.com)'

interface NominatimAddress {
  house_number?: string
  road?: string
  city?: string
  town?: string
  village?: string
  municipality?: string
  county?: string
  state?: string
  postcode?: string
}

interface NominatimResult {
  place_id: number
  lat: string
  lon: string
  display_name: string
  name?: string
  address?: NominatimAddress
}

function pickCity(address?: NominatimAddress): string | null {
  if (!address) return null
  return (
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.county ??
    null
  )
}

function pickStreet(address?: NominatimAddress): string | null {
  if (!address) return null
  const parts = [address.house_number, address.road].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : null
}

function mapNominatimResult(row: NominatimResult): GeocodeResult {
  const address = row.address
  const street = pickStreet(address)
  const city = pickCity(address)
  const state = address?.state ?? null
  const shortName =
    row.name?.trim() ||
    [street, city].filter(Boolean).join(', ') ||
    row.display_name.split(',')[0]?.trim() ||
    'Place'

  return {
    osmId: String(row.place_id),
    name: shortName,
    displayName: row.display_name,
    address: street,
    city,
    state,
    latitude: Number(row.lat),
    longitude: Number(row.lon),
  }
}

export async function searchPlacesNominatim(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    addressdetails: '1',
    limit: '8',
  })

  const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  })

  if (!response.ok) {
    throw new Error('Place search is temporarily unavailable.')
  }

  const data = (await response.json()) as NominatimResult[]
  return data.map(mapNominatimResult)
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'json',
    addressdetails: '1',
    zoom: '16',
  })

  const response = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  })

  if (!response.ok) return null

  const data = (await response.json()) as NominatimResult
  if (!data?.lat || !data?.lon) return null
  return mapNominatimResult(data)
}
