import { API_URL } from '@/config/api'

function buildEndpointUrl(path) {
  const cleanPath = String(path || '').replace(/^\/api(?=\/|$)/, '')
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`
  return `${API_URL}${normalizedPath}`
}

async function requestJson(path, options = {}) {
  const response = await fetch(buildEndpointUrl(path), {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo completar la solicitud.')
  }

  return data
}

export const tenantService = {
  obtenerPerfil: async idInquilino => {
    const encodedId = encodeURIComponent(String(idInquilino))
    const data = await requestJson(`/inquilino/profile/${encodedId}`)
    return data.profile || data.user || data.usuario || data
  },

  obtenerPerfilCompleto: async idInquilino => {
    const encodedId = encodeURIComponent(String(idInquilino))
    const data = await requestJson(`/inquilino/profile/${encodedId}`)
    return {
      perfil: data.profile || data.user || data.usuario || data,
      reservas: data.reservations || data.reservas || [],
      favoritos: data.favorites || data.favoritos || [],
    }
  },

  actualizarPerfil: async (idInquilino, updates) => {
    const encodedId = encodeURIComponent(String(idInquilino))
    const data = await requestJson(`/inquilino/profile/${encodedId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    return data.profile || data.user || data.usuario || data
  },

  obtenerReservas: async idInquilino => {
    const params = new URLSearchParams({ id_inquilino: String(idInquilino) })
    const data = await requestJson(`/inquilino/reservas?${params.toString()}`)
    return data.reservations || data.reservas || []
  },

  obtenerFavoritos: async idInquilino => {
    const encodedId = encodeURIComponent(String(idInquilino))
    const data = await requestJson(`/inquilino/profile/${encodedId}`)
    return data.favorites || data.favoritos || []
  },
}
