import { authService } from "../services/authService";

export interface AuthUserPayload {
  id?: number | string;
  id_inquilino?: number | string;
  id_arrendatario?: number | string;
  nombre?: string;
  name?: string;
  correo?: string;
  email?: string;
  telefono?: string;
  phone?: string;
  role?: string;
  rol?: string;
  tipo?: string;
  [key: string]: unknown;
}

export interface AuthResponse {
  success?: boolean;
  requires2FA?: boolean;
  message?: string;
  role?: string;
  rol?: string;
  token?: string;
  accessToken?: string;
  user?: AuthUserPayload;
  usuario?: AuthUserPayload;
  data?: AuthUserPayload;
  [key: string]: unknown;
}

function esCuentaAdministrador(payload: any): boolean {
  const userObj = payload?.user || payload?.usuario || payload?.admin || payload || {};
  const rawRole = String(
    payload?.role ||
      payload?.rol ||
      userObj?.role ||
      userObj?.rol ||
      userObj?.tipo ||
      "",
  )
    .trim()
    .toLowerCase();

  return (
    rawRole === "administrador" ||
    rawRole === "admin" ||
    Boolean(payload?.admin) ||
    Boolean(userObj?.id_admin || userObj?.id_administrador)
  );
}

export const authController = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = (await authService.loginUser(
        email,
        password,
      )) as AuthResponse;

      if (!response) {
        return {
          success: false,
          message: "No se recibió respuesta del servidor.",
        };
      }

      // Bloquear cuentas de administrador en la aplicación móvil
      if (esCuentaAdministrador(response)) {
        authService.logout();
        return {
          success: false,
          message:
            "El acceso de administrador solo está disponible en la versión web.",
        };
      }

      // Normalizar éxito cuando el backend devuelve user/token o requires2FA sin flag explícito
      const isSuccess =
        response.success === true ||
        Boolean(response.requires2FA) ||
        Boolean(response.token || response.accessToken) ||
        Boolean(response.user || response.usuario);

      return {
        ...response,
        success: response.success === false ? false : isSuccess,
      };
    } catch (error: unknown) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Error al conectar con el servidor de autenticación.",
      };
    }
  },

  verify2FA: async (
    email: string,
    code: string,
    role: string,
  ): Promise<AuthResponse> => {
    try {
      const response = (await authService.verify2FA(
        email,
        code,
        role,
      )) as AuthResponse;

      if (!response) {
        return {
          success: false,
          message: "No se pudo verificar el código.",
        };
      }

      if (esCuentaAdministrador(response)) {
        authService.logout();
        return {
          success: false,
          message:
            "El acceso de administrador solo está disponible en la versión web.",
        };
      }

      const isSuccess =
        response.success === true ||
        Boolean(response.token || response.accessToken) ||
        Boolean(response.user || response.usuario);

      return {
        ...response,
        success: response.success === false ? false : isSuccess,
      };
    } catch (error: unknown) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Error al verificar el código de seguridad.",
      };
    }
  },

  register: async (
    userData: Record<string, unknown>,
  ): Promise<AuthResponse> => {
    try {
      const requestedRole = String(userData.role || userData.rol || "inquilino")
        .trim()
        .toLowerCase();

      if (requestedRole === "administrador" || requestedRole === "admin") {
        return {
          success: false,
          message:
            "No está permitido registrar cuentas de administrador en la aplicación móvil.",
        };
      }

      const isHost =
        requestedRole === "arrendatario" ||
        requestedRole === "host" ||
        requestedRole === "anfitrion" ||
        requestedRole === "anfitrión";

      // IMPORTANTE: En server/index.js (POST /api/auth/register), el backend evalúa:
      // `const role = req.body?.role === "host" ? "arrendatario" : "inquilino";`
      // Por ello debemos enviar "host" para arrendatario y "guest" para inquilino.
      const backendRegisterRole = isHost ? "host" : "guest";
      const normalizedRole = isHost ? "arrendatario" : "inquilino";

      const cleanName = String(
        userData.nombre || userData.name || "",
      ).trim();
      const cleanEmail = String(
        userData.correo || userData.email || "",
      )
        .trim()
        .toLowerCase();
      const cleanPhone = String(
        userData.telefono || userData.phone || "",
      ).trim();
      const rawPassword = String(
        userData.contrasena || userData.password || "",
      );

      const payload = {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        password: rawPassword,
        confirmPassword: String(userData.confirmPassword || rawPassword),
        role: backendRegisterRole,
        rol: normalizedRole,
      };

      const response = (await authService.registerUser(
        payload,
      )) as AuthResponse;

      if (!response) {
        return {
          success: false,
          message: "No se recibió respuesta del servidor.",
        };
      }

      if (esCuentaAdministrador(response)) {
        return {
          success: false,
          message:
            "El registro de administrador no está permitido en la versión móvil.",
        };
      }

      const isSuccess =
        response.success === true ||
        Boolean(response.user || response.usuario || response.data);

      return {
        ...response,
        success: response.success === false ? false : isSuccess,
      };
    } catch (error: unknown) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Error al registrar usuario.",
      };
    }
  },

  logout: (): void => {
    authService.logout();
  },

  getSession: () => {
    return authService.getSession();
  },
};
