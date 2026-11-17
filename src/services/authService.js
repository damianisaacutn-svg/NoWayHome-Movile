// src/services/authService.js
import { API_URL } from "../config/api";

/*
|--------------------------------------------------------------------------
| Servicio móvil de autenticación y sesión activa (React Native / Expo)
|--------------------------------------------------------------------------
| Consume los endpoints Express para login unificado, verificación 2FA y
| registro exclusivamente para Inquilinos y Arrendatarios, manteniendo el
| estado reactivo de la sesión para componentes como Header.
| (Se ha omitido el acceso de administrador para la versión móvil).
*/

const SESSION_STORAGE_KEY = "nowayhome_session";
const LEGACY_WEB_KEYS = ["user", "usuario", "token", "authToken", "role"];

// Almacenamiento en memoria para sesiones en dispositivos nativos sin localStorage
const memoryKVStore = new Map();

function getStorageAdapter() {
  try {
    if (
      typeof globalThis !== "undefined" &&
      "localStorage" in globalThis &&
      globalThis.localStorage
    ) {
      return globalThis.localStorage;
    }
  } catch {
    // Ignorar entornos nativos donde localStorage no está habilitado
  }
  return {
    getItem: (key) => (memoryKVStore.has(key) ? memoryKVStore.get(key) : null),
    setItem: (key, value) => memoryKVStore.set(key, String(value)),
    removeItem: (key) => memoryKVStore.delete(key),
  };
}

function createEmptySession() {
  return {
    isAuthenticated: false,
    user: null,
    token: null,
    role: null,
  };
}

function loadInitialSession() {
  const storage = getStorageAdapter();
  if (!storage) {
    return createEmptySession();
  }

  try {
    const rawSession = storage.getItem(SESSION_STORAGE_KEY);
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      if (parsed && (parsed.isAuthenticated || parsed.token || parsed.user)) {
        return {
          isAuthenticated: true,
          user: parsed.user || null,
          token: parsed.token || null,
          role: parsed.role || null,
        };
      }
    }

    const legacyToken =
      storage.getItem("token") || storage.getItem("authToken") || null;
    const rawUser = storage.getItem("user") || storage.getItem("usuario");
    const legacyUser = rawUser ? JSON.parse(rawUser) : null;
    const legacyRole = storage.getItem("role") || null;

    if (legacyToken || legacyUser) {
      return {
        isAuthenticated: true,
        user: legacyUser,
        token: legacyToken,
        role: legacyRole,
      };
    }
  } catch {
    // Si el JSON guardado está corrupto, iniciar con sesión limpia
  }

  return createEmptySession();
}

async function postJson(path, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      message:
        data.message ||
        data.error ||
        `No se pudo completar la solicitud (HTTP ${response.status}).`,
    };
  }

  return data;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasValidIdentifier(value) {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") {
    const clean = value.trim();
    return clean !== "" && clean.toLowerCase() !== "null" && clean.toLowerCase() !== "undefined";
  }
  return false;
}

function pickValidIdentifier(...candidates) {
  for (const candidate of candidates) {
    if (hasValidIdentifier(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function extractUserCandidate(payload) {
  if (!isPlainObject(payload)) return null;

  const nestedData = isPlainObject(payload.data) ? payload.data : null;
  const direct =
    (isPlainObject(payload.user) && payload.user) ||
    (isPlainObject(payload.usuario) && payload.usuario) ||
    (isPlainObject(payload.arrendatario) && payload.arrendatario) ||
    (isPlainObject(payload.inquilino) && payload.inquilino) ||
    (isPlainObject(payload.profile) && payload.profile) ||
    (nestedData &&
      ((isPlainObject(nestedData.user) && nestedData.user) ||
        (isPlainObject(nestedData.usuario) && nestedData.usuario) ||
        (isPlainObject(nestedData.arrendatario) && nestedData.arrendatario) ||
        (isPlainObject(nestedData.inquilino) && nestedData.inquilino) ||
        (isPlainObject(nestedData.profile) && nestedData.profile) ||
        nestedData)) ||
    null;

  if (direct) return direct;

  if (
    hasValidIdentifier(payload.id) ||
    hasValidIdentifier(payload.id_arrendatario) ||
    hasValidIdentifier(payload.id_inquilino) ||
    hasValidIdentifier(payload.id_usuario) ||
    payload.correo ||
    payload.email
  ) {
    return payload;
  }

  return null;
}

function normalizeRoleString(raw) {
  const clean = String(raw || "").trim().toLowerCase();
  if (
    clean === "arrendatario" ||
    clean === "arrendador" ||
    clean === "host" ||
    clean === "anfitrion" ||
    clean === "anfitrión"
  ) {
    return "arrendatario";
  }
  if (
    clean === "inquilino" ||
    clean === "guest" ||
    clean === "huesped" ||
    clean === "huésped"
  ) {
    return "inquilino";
  }
  return clean || null;
}

function normalizeSessionPayloadUser(payload, resolvedUser, resolvedRole) {
  if (!resolvedUser) return null;

  const normalizedRole =
    normalizeRoleString(resolvedRole) ||
    normalizeRoleString(
      resolvedUser.role ||
        resolvedUser.rol ||
        resolvedUser.tipo ||
        payload?.role ||
        payload?.rol ||
        payload?.tipo,
    );

  const baseId = pickValidIdentifier(
    resolvedUser.id,
    resolvedUser.id_arrendatario,
    resolvedUser.idArrendatario,
    resolvedUser.arrendatario_id,
    resolvedUser.id_arrendador,
    resolvedUser.id_inquilino,
    resolvedUser.id_usuario,
    resolvedUser.idUsuario,
    resolvedUser.usuario_id,
    resolvedUser.userId,
    resolvedUser.user_id,
    payload?.id,
    payload?.id_usuario,
  );

  const landlordId =
    normalizedRole === "arrendatario"
      ? pickValidIdentifier(
          resolvedUser.id_arrendatario,
          resolvedUser.idArrendatario,
          resolvedUser.arrendatario_id,
          resolvedUser.id_arrendador,
          payload?.id_arrendatario,
          baseId,
        )
      : pickValidIdentifier(resolvedUser.id_arrendatario);

  const tenantId =
    normalizedRole === "inquilino"
      ? pickValidIdentifier(
          resolvedUser.id_inquilino,
          payload?.id_inquilino,
          baseId,
        )
      : pickValidIdentifier(resolvedUser.id_inquilino);

  return {
    ...resolvedUser,
    ...(baseId !== undefined ? { id: baseId } : {}),
    ...(landlordId !== undefined ? { id_arrendatario: landlordId } : {}),
    ...(tenantId !== undefined ? { id_inquilino: tenantId } : {}),
    ...(normalizedRole ? { role: normalizedRole, rol: normalizedRole } : {}),
  };
}

class AuthService {
  constructor() {
    // El backend de Node.js maneja la conexión con Supabase.
    this._session = loadInitialSession();
    this._listeners = new Set();
  }

  // ----------------------------------------------------------------------
  // GESTIÓN REACTIVA DE SESIÓN ACTIVA (USADA POR HEADER Y PANTALLAS)
  // ----------------------------------------------------------------------

  getSession() {
    return { ...this._session };
  }

  getSessionSnapshot() {
    return this._session;
  }

  isAuthenticated() {
    return Boolean(this._session.isAuthenticated);
  }

  setSession(payload) {
    if (!payload) {
      this.logout();
      return;
    }

    const rawResolvedUser = extractUserCandidate(payload);
    const resolvedToken =
      payload.token ||
      payload.accessToken ||
      (isPlainObject(payload.data) &&
        (payload.data.token || payload.data.accessToken)) ||
      null;
    const rawRole =
      payload.role ||
      payload.rol ||
      payload.tipo ||
      (isPlainObject(payload.data) &&
        (payload.data.role || payload.data.rol || payload.data.tipo)) ||
      (rawResolvedUser &&
        (rawResolvedUser.role ||
          rawResolvedUser.rol ||
          rawResolvedUser.tipo ||
          (hasValidIdentifier(rawResolvedUser.id_arrendatario) &&
          !hasValidIdentifier(rawResolvedUser.id_inquilino)
            ? "arrendatario"
            : null))) ||
      null;
    const resolvedRole = normalizeRoleString(rawRole);
    const resolvedUser = normalizeSessionPayloadUser(
      payload,
      rawResolvedUser,
      resolvedRole,
    );

    this._session = {
      isAuthenticated: true,
      user: resolvedUser,
      token: resolvedToken,
      role: resolvedRole,
    };

    const storage = getStorageAdapter();
    if (storage) {
      try {
        storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this._session));
      } catch {
        // Ignorar límites de almacenamiento
      }
    }

    this._notifyListeners();
  }

  logout() {
    this._session = createEmptySession();

    const storage = getStorageAdapter();
    if (storage) {
      try {
        storage.removeItem(SESSION_STORAGE_KEY);
        for (const key of LEGACY_WEB_KEYS) {
          storage.removeItem(key);
        }
      } catch {
        // Ignorar errores de limpieza en almacenamiento web
      }
    }

    this._notifyListeners();
  }

  // Utilidades para guardar/leer claves auxiliares (ej. pending_2fa, last_registered_user)
  getStorageItem(key) {
    try {
      const storage = getStorageAdapter();
      return storage ? storage.getItem(key) : null;
    } catch {
      return null;
    }
  }

  setStorageItem(key, value) {
    try {
      const storage = getStorageAdapter();
      if (storage) {
        storage.setItem(key, String(value));
      }
    } catch {
      // Ignorar errores de almacenamiento
    }
  }

  removeStorageItem(key) {
    try {
      const storage = getStorageAdapter();
      if (storage) {
        storage.removeItem(key);
      }
    } catch {
      // Ignorar errores de almacenamiento
    }
  }

  /**
   * Suscribe un listener a los cambios de sesión (login / logout).
   * @param {(session: { isAuthenticated: boolean, user: Record<string, unknown> | null, token: string | null, role: string | null }) => void} listener
   * @returns {() => void} Función para cancelar la suscripción.
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  _notifyListeners() {
    const snapshot = this.getSession();
    this._listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error("Error notificando cambio de sesión:", err);
      }
    });
  }

  // ----------------------------------------------------------------------
  // MÉTODOS PARA USUARIOS COMUNES (INQUILINOS Y ARRENDATARIOS)
  // ----------------------------------------------------------------------

  async loginUser(correo, contrasena) {
    const normalizedEmail = correo.trim().toLowerCase();

    try {
      const result = await postJson("/auth/login", {
        correo: normalizedEmail,
        contrasena,
      });

      // Si el login completa directamente sin requerir 2FA, activamos la sesión
      if (
        result &&
        result.success &&
        !result.requires2FA &&
        (result.token ||
          result.accessToken ||
          result.user ||
          result.usuario ||
          result.arrendatario ||
          result.inquilino ||
          result.profile ||
          isPlainObject(result.data))
      ) {
        this.setSession(result);
      }

      return result;
    } catch (error) {
      console.error("Error en loginUser (Móvil):", error);
      return {
        success: false,
        message: error.message || "Error desconocido en la autenticación",
      };
    }
  }

  async verify2FA(correo, codigo, role) {
    try {
      const normalizedEmail = correo.trim().toLowerCase();
      const result = await postJson("/auth/verify-2fa", {
        correo: normalizedEmail,
        codigo,
        role,
      });

      if (result && result.success) {
        const extractedUser = extractUserCandidate(result) || {
          correo: normalizedEmail,
        };
        const resolvedRole =
          normalizeRoleString(
            result.role ||
              result.rol ||
              extractedUser.role ||
              extractedUser.rol ||
              (hasValidIdentifier(extractedUser.id_arrendatario) &&
              !hasValidIdentifier(extractedUser.id_inquilino)
                ? "arrendatario"
                : null) ||
              role,
          ) || null;
        this.setSession({
          ...result,
          role: resolvedRole,
          user: extractedUser,
        });
      }

      return result;
    } catch (error) {
      console.error("Error en verify2FA (Móvil):", error);
      return {
        success: false,
        message: error.message || "Error al verificar el código.",
      };
    }
  }

  async registerUser(userData) {
    try {
      return await postJson("/auth/register", userData);
    } catch (error) {
      console.error("Error en registerUser (Móvil):", error);
      return {
        success: false,
        message: error.message || "Error en el registro",
      };
    }
  }

  async updatePassword(data) {
    try {
      return await postJson("/auth/update-password", data);
    } catch (error) {
      console.error("Error en updatePassword (Móvil):", error);
      return {
        success: false,
        message: error.message || "Error al actualizar la contraseña.",
      };
    }
  }
}

export const authService = new AuthService();
