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

function getWebStorage() {
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
  return null;
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
  const storage = getWebStorage();
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
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      message: data.message || "No se pudo completar la solicitud.",
    };
  }

  return data;
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

    const resolvedUser = payload.user || payload.usuario || payload.data || null;
    const resolvedToken = payload.token || payload.accessToken || null;
    const resolvedRole =
      payload.role ||
      payload.rol ||
      (resolvedUser && (resolvedUser.role || resolvedUser.rol)) ||
      null;

    this._session = {
      isAuthenticated: true,
      user: resolvedUser,
      token: resolvedToken,
      role: resolvedRole,
    };

    const storage = getWebStorage();
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

    const storage = getWebStorage();
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
        (result.token || result.user || result.usuario)
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
      const result = await postJson("/auth/verify-2fa", {
        correo: correo.trim().toLowerCase(),
        codigo,
        role,
      });

      if (result && result.success) {
        this.setSession({
          ...result,
          role: result.role || role || null,
          user: result.user || result.usuario || { correo: correo.trim().toLowerCase() },
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
