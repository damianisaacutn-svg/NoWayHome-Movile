// Este componente define el archivo API principal que se encarga de
// conectar la aplicación móvil de Expo con el servidor backend (Node.js/Express)
// utilizando la IP de red local o un túnel público (como Ngrok).

const configuredApiUrl = String(process.env.EXPO_PUBLIC_API_URL || "")
  .trim()
  .replace(/\/+$/, "");

if (!configuredApiUrl && process.env.NODE_ENV === "production") {
  throw new Error(
    "Falta configurar EXPO_PUBLIC_API_URL para conectar con NoWayHome API.",
  );
}

const defaultApiUrl = "http://192.168.100.9:3001/api";

// Garantiza que API_URL siempre termine en /api sin duplicarlo
export const API_URL = configuredApiUrl
  ? configuredApiUrl.endsWith("/api")
    ? configuredApiUrl
    : `${configuredApiUrl}/api`
  : defaultApiUrl;

// URL raíz del servidor (sin /api) para resolver imágenes o archivos relativos
export const API_BASE_URL = API_URL.replace(/\/api$/, "");
