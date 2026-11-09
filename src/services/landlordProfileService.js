import { API_URL } from '@/config/api'

function buildEndpointUrl(path) {
  const cleanPath = String(path || '').replace(/^\/api(?=\/|$)/, '')
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`
  return `${API_URL}${normalizedPath}`
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

  return data.profile || data.user || data.usuario || data
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

  return data.profile || data.user || data.usuario || data
}
