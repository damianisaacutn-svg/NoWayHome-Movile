import { API_URL } from '@/config/api'

function buildEndpointUrl(path) {
  const cleanPath = String(path || '').replace(/^\/api(?=\/|$)/, '')
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`
  return `${API_URL}${normalizedPath}`
}

export async function geocodeAddress(address) {
  const params = new URLSearchParams({
    address: String(address || '').trim(),
  })

  const response = await fetch(buildEndpointUrl(`/geocode?${params.toString()}`), {
    headers: {
      Accept: 'application/json',
    },
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || data.error || 'No se pudo buscar la ubicacion.')
  }

  const location = data.location || data.data || data
  if (
    !location ||
    location.latitud === undefined ||
    location.longitud === undefined
  ) {
    throw new Error('No se encontro una ubicacion para esa direccion.')
  }

  return location
}

