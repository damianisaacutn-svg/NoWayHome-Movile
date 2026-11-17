import { API_URL } from '@/config/api'

function buildEndpointUrl(path) {
  const cleanPath = String(path || '').replace(/^\/api(?=\/|$)/, '')
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`
  return `${API_URL}${normalizedPath}`
}

function extractProfilePayload(data) {
  if (!data || typeof data !== 'object') return data
  if (data.profile || data.arrendatario || data.user || data.usuario) {
    return data.profile || data.arrendatario || data.user || data.usuario
  }
  if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    return (
      data.data.profile ||
      data.data.arrendatario ||
      data.data.user ||
      data.data.usuario ||
      data.data
    )
  }
  return data
}

export async function getLandlordProfile(idArrendatario) {
  const response = await fetch(
    buildEndpointUrl(`/arrendatario/profile/${encodeURIComponent(String(idArrendatario))}`),
    {
      headers: {
        Accept: 'application/json',
      },
    }
  )
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo cargar tu informacion.')
  }

  return extractProfilePayload(data)
}

export async function updateLandlordProfile(idArrendatario, profileData) {
  const response = await fetch(
    buildEndpointUrl(`/arrendatario/profile/${encodeURIComponent(String(idArrendatario))}`),
    {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    }
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo actualizar tu informacion. Intenta nuevamente.')
  }

  return extractProfilePayload(data)
}
