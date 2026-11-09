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

export const landlordBookingService = {
  obtenerReservasRecibidas: async idArrendatario => {
    const data = await requestJson(
      `/arrendatario/reservas?id_arrendatario=${encodeURIComponent(String(idArrendatario))}`
    )
    return data.reservations || []
  },

  cambiarEstadoReserva: async (idReserva, idArrendatario, estado, motivo = '') => {
    const parsedIdReserva = Number(idReserva)
    if (!Number.isInteger(parsedIdReserva) || parsedIdReserva <= 0) {
      throw new Error('La reserva no tiene un id_reserva valido.')
    }

    const encodedId = encodeURIComponent(String(parsedIdReserva))
    const data = await requestJson(`/arrendatario/reservas/${encodedId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        id_arrendatario: idArrendatario,
        estado,
        motivo_rechazo: typeof motivo === 'string' ? motivo.trim() : '',
      }),
    })
    return data.reserva
  },
}
