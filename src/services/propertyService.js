import { API_URL } from '@/config/api'

function buildEndpointUrl(path) {
  const cleanPath = String(path || '').replace(/^\/api(?=\/|$)/, '')
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`
  return `${API_URL}${normalizedPath}`
}

export async function createProperty(formData) {
  const response = await fetch(buildEndpointUrl('/arrendatario/properties'), {
    method: 'POST',
    body: formData,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo registrar la propiedad')
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
    throw new Error(data.message || 'No se pudieron cargar tus propiedades. Intenta nuevamente.')
  }

  return data.properties || []
}

export async function getPropertyById(idPropiedad, idArrendatario) {
  const params = new URLSearchParams({
    id_arrendatario: String(idArrendatario),
  })

  const response = await fetch(
    buildEndpointUrl(`/arrendatario/properties/${idPropiedad}?${params.toString()}`),
    {
      headers: {
        Accept: 'application/json',
      },
    }
  )
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo cargar la propiedad.')
  }

  return data.property
}

export async function updateProperty(idPropiedad, formData) {
  const response = await fetch(buildEndpointUrl(`/arrendatario/properties/${idPropiedad}`), {
    method: 'PATCH',
    body: formData,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo actualizar la propiedad.')
  }

  return data
}

export async function deletePropertyImage(idPropiedad, imageId, idArrendatario) {
  const params = new URLSearchParams({
    id_arrendatario: String(idArrendatario),
  })

  const response = await fetch(
    buildEndpointUrl(
      `/arrendatario/properties/${idPropiedad}/images/${imageId}?${params.toString()}`
    ),
    {
      method: 'DELETE',
    }
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo eliminar la imagen.')
  }

  return data
}

export async function replacePropertyImage(idPropiedad, imageId, formData) {
  const response = await fetch(
    buildEndpointUrl(`/arrendatario/properties/${idPropiedad}/images/${imageId}`),
    {
      method: 'PATCH',
      body: formData,
    }
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo reemplazar la imagen.')
  }

  return data
}
