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

export const tenantBookingService = {
  crearReservaPendiente: async reservaData => {
    const data = await requestJson('/inquilino/reservas', {
      method: 'POST',
      body: JSON.stringify(reservaData),
    })
    return data.reservation
  },

  confirmarReserva: async reservaIdentifier => {
    const id =
      typeof reservaIdentifier === 'object'
        ? reservaIdentifier.id_reserva || reservaIdentifier.id || 'actual'
        : reservaIdentifier
    const data = await requestJson(`/inquilino/reservas/${encodeURIComponent(String(id))}/confirm`, {
      method: 'PATCH',
      body: JSON.stringify({ reservation: reservaIdentifier }),
    })
    return data.reservation
  },

  cancelarReserva: async ({ idReserva, idInquilino, motivoCancelacion }) => {
    const data = await requestJson(
      `/inquilino/reservas/${encodeURIComponent(String(idReserva))}/cancel`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          id_inquilino: idInquilino,
          motivo_cancelacion: motivoCancelacion || '',
        }),
      }
    )
    return data.reserva || data.reservation || data
  },
}
