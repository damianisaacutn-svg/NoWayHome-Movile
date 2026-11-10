import { authService } from "@/services/authService";

export type AppUserRole = "inquilino" | "arrendatario";

export interface SessionUserLike {
  id?: number | string | null;
  id_inquilino?: number | string | null;
  id_arrendatario?: number | string | null;
  nombre?: string | null;
  name?: string | null;
  correo?: string | null;
  email?: string | null;
  telefono?: string | null;
  role?: string | null;
  rol?: string | null;
  tipo?: string | null;
  [key: string]: unknown;
}

const LANDLORD_ROLES = new Set([
  "arrendatario",
  "arrendador",
  "host",
  "anfitrion",
  "anfitrión",
]);

const TENANT_ROLES = new Set([
  "inquilino",
  "guest",
  "huesped",
  "huésped",
]);

export function isLandlordRole(rawRole: unknown): boolean {
  const normalized = String(rawRole || "").trim().toLowerCase();
  return LANDLORD_ROLES.has(normalized);
}

export function isTenantRole(rawRole: unknown): boolean {
  const normalized = String(rawRole || "").trim().toLowerCase();
  return TENANT_ROLES.has(normalized);
}

export function getStoredSessionUser(): SessionUserLike | null {
  const session = authService.getSession();
  const sessionUser =
    session?.user && typeof session.user === "object"
      ? (session.user as SessionUserLike)
      : null;

  if (sessionUser) {
    if (session?.role && !sessionUser.role) {
      return {
        ...sessionUser,
        role: String(session.role),
      };
    }
    return sessionUser;
  }

  const rawStored = authService.getStorageItem("user");
  if (!rawStored) return null;

  try {
    const parsed = JSON.parse(rawStored) as SessionUserLike;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function resolveUserRole(
  user: SessionUserLike | null | undefined,
  sessionRole?: unknown,
): AppUserRole | null {
  if (!user && !sessionRole) return null;

  const explicitRole =
    sessionRole ?? user?.role ?? user?.rol ?? user?.tipo ?? "";
  if (isLandlordRole(explicitRole)) return "arrendatario";
  if (isTenantRole(explicitRole)) return "inquilino";

  if (user?.id_arrendatario && !user?.id_inquilino) {
    return "arrendatario";
  }
  if (user?.id_inquilino && !user?.id_arrendatario) {
    return "inquilino";
  }

  return null;
}

export function getLandlordId(
  user: SessionUserLike | null | undefined,
  sessionRole?: unknown,
): string | number | null {
  if (!user) return null;
  if (user.id_arrendatario !== undefined && user.id_arrendatario !== null && user.id_arrendatario !== "") {
    return user.id_arrendatario;
  }
  const role = resolveUserRole(user, sessionRole);
  if (role === "arrendatario" && user.id !== undefined && user.id !== null && user.id !== "") {
    return user.id;
  }
  return null;
}

export function getTenantId(
  user: SessionUserLike | null | undefined,
  sessionRole?: unknown,
): string | number | null {
  if (!user) return null;
  if (user.id_inquilino !== undefined && user.id_inquilino !== null && user.id_inquilino !== "") {
    return user.id_inquilino;
  }
  const role = resolveUserRole(user, sessionRole);
  if (role === "arrendatario") {
    return null;
  }
  if (user.id !== undefined && user.id !== null && user.id !== "") {
    return user.id;
  }
  return null;
}
