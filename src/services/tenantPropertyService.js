import { API_URL } from "@/config/api";

function buildEndpointUrl(path) {
  // Evita duplicar /api cuando API_URL ya incluye el sufijo /api
  const cleanPath = String(path || "").replace(/^\/api(?=\/|$)/, "");
  const normalizedPath = cleanPath.startsWith("/")
    ? cleanPath
    : `/${cleanPath}`;
  return `${API_URL}${normalizedPath}`;
}

async function requestJson(path) {
  const url = buildEndpointUrl(path);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `No se pudieron cargar las propiedades (HTTP ${response.status}).`,
    );
  }

  return data;
}

export const tenantPropertyService = {
  obtenerPropiedadesDisponibles: async () => {
    const data = await requestJson("/inquilino/properties");
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.properties)) {
      return data.properties;
    }
    if (Array.isArray(data?.data)) {
      return data.data;
    }
    return [];
  },

  obtenerPropiedadPorId: async (id) => {
    const data = await requestJson(
      `/inquilino/properties/${encodeURIComponent(String(id))}`,
    );
    return data?.property ?? data?.data ?? data;
  },
};
