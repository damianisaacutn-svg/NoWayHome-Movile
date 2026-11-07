import { API_URL } from "@/config/api";

/*
|--------------------------------------------------------------------------
| Servicio móvil de recuperación de contraseña (React Native / Expo)
|--------------------------------------------------------------------------
| Centraliza llamadas HTTP para el flujo propio de recuperación:
| - POST /api/auth/forgot-password
| - GET  /api/auth/reset-password/status
| - POST /api/auth/reset-password
|
| Seguridad:
| - No guarda tokens sensibles en texto plano fuera de su validación.
| - Evita duplicar el prefijo `/api` ya incluido en `API_URL`.
*/
function buildEndpointUrl(path) {
  const cleanPath = String(path || "").replace(/^\/api(?=\/|$)/, "");
  const normalizedPath = cleanPath.startsWith("/")
    ? cleanPath
    : `/${cleanPath}`;
  return `${API_URL}${normalizedPath}`;
}

async function postJson(path, body) {
  const url = buildEndpointUrl(path);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || "No se pudo completar la solicitud.",
    );
  }

  return data;
}

export function requestPasswordReset(correo) {
  // POST /api/auth/forgot-password
  // Envía `clientOrigin: "mobile"` para que el enlace del correo sepa que
  // proviene de la app móvil y oculte accesos al login de la web.
  const normalizedEmail = String(correo || "").trim().toLowerCase();
  return postJson("/auth/forgot-password", {
    correo: normalizedEmail,
    clientOrigin: "mobile",
  });
}

export async function checkResetTokenStatus(token) {
  // GET /api/auth/reset-password/status?token=...
  // Consulta si el token sigue activo o si ya fue utilizado / expiró.
  const cleanToken = String(token || "").trim();
  if (!cleanToken) {
    return { valid: false, status: "invalid" };
  }

  const url = buildEndpointUrl(
    `/auth/reset-password/status?token=${encodeURIComponent(cleanToken)}`,
  );
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Si el endpoint de estado no está disponible aún, no bloquear enlaces nuevos
    return {
      valid: true,
      skipped: true,
    };
  }

  return data;
}

export function resetPassword(token, nuevaContrasena) {
  // POST /api/auth/reset-password
  // Envía: { token, nuevaContrasena }
  const cleanToken = String(token || "").trim();
  return postJson("/auth/reset-password", {
    token: cleanToken,
    nuevaContrasena,
  });
}
