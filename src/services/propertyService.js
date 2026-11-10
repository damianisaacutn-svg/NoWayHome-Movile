import { API_URL } from '@/config/api'

function buildEndpointUrl(path) {
  const cleanPath = String(path || '').replace(/^\/api(?=\/|$)/, '')
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`
  return `${API_URL}${normalizedPath}`
}

export async function createProperty(formData) {
  const response = await fetch(buildEndpointUrl('/arrendatario/properties'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body: formData,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || data.error || 'No se pudo registrar la propiedad')
  }

  return data
}

export async function getLandlordProperties(idArrendatario) {
  const params = new URLSearchParams({
    id_arrendatario: String(idArrendatario),
  })

  const response = await fetch(
    buildEndpointUrl(`/arrendatario/properties?${params.toString()}`),
    {
      headers: {
        Accept: 'application/json',
      },
    }
  )
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || data.error || 'No se pudieron cargar tus propiedades. Intenta nuevamente.')
  }

  if (Array.isArray(data)) return data
  return data.properties || data.propiedades || data.data || []
}

export async function getPropertyById(idPropiedad, idArrendatario) {
  const params = new URLSearchParams({
    id_arrendatario: String(idArrendatario),
  })

  const response = await fetch(
    buildEndpointUrl(`/arrendatario/properties/${encodeURIComponent(String(idPropiedad))}?${params.toString()}`),
    {
      headers: {
        Accept: 'application/json',
      },
    }
  )
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || data.error || 'No se pudo cargar la propiedad.')
  }

  return data.property || data.propiedad || data.data || data
}

export async function updateProperty(idPropiedad, formData) {
  const response = await fetch(
    buildEndpointUrl(`/arrendatario/properties/${encodeURIComponent(String(idPropiedad))}`),
    {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
      },
      body: formData,
    }
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || data.error || 'No se pudo actualizar la propiedad.')
  }

  return data
}

export async function deletePropertyImage(idPropiedad, imageId, idArrendatario) {
  const params = new URLSearchParams({
    id_arrendatario: String(idArrendatario),
  })

  const response = await fetch(
    buildEndpointUrl(
      `/arrendatario/properties/${encodeURIComponent(String(idPropiedad))}/images/${encodeURIComponent(String(imageId))}?${params.toString()}`
    ),
    {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
      },
    }
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || data.error || 'No se pudo eliminar la imagen.')
  }

  return data
}

export async function replacePropertyImage(idPropiedad, imageId, formData) {
  const response = await fetch(
    buildEndpointUrl(
      `/arrendatario/properties/${encodeURIComponent(String(idPropiedad))}/images/${encodeURIComponent(String(imageId))}`
    ),
    {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
      },
      body: formData,
    }
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || data.error || 'No se pudo reemplazar la imagen.')
  }

  return data
}

