export interface MapboxPlaceResult {
  mapboxId: string
  name: string
  featureType: string
  address: string | null
  fullAddress: string | null
  city: string | null
  region: string | null
  postalCode: string | null
  country: string | null
  latitude: number
  longitude: number
  category: string | null
  poiCategories: string[]
  brand: string | null
  distanceMeters?: number
}
