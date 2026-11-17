import { authService } from "@/services/authService";

export type AppUserRole = "inquilino" | "arrendatario";

export interface SessionUserLike {
  id?: number | string | null;
  id_inquilino?: number | string | null;
  id_arrendatario?: number | string | null;
  id_usuario?: number | string | null;
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

export function hasValidId(value: unknown): value is string | number {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed !== "" && trimmed.toLowerCase() !== "null" && trimmed.toLowerCase() !== "undefined";
  }
  return false;
}

export function pickValidId(
  ...candidates: unknown[]
): string | number | null {
  for (const candidate of candidates) {
    if (hasValidId(candidate)) {
      return candidate;
    }
  }
  return null;
}

function pickFirstNonEmptyRole(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    const normalized = String(candidate).trim();
    if (
      normalized &&
      normalized.toLowerCase() !== "null" &&
      normalized.toLowerCase() !== "undefined"
    ) {
      return normalized;
    }
  }
  return "";
}

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
    const fallbackRole = pickFirstNonEmptyRole(
      sessionUser.role,
      sessionUser.rol,
      sessionUser.tipo,
      session?.role,
    );
    if (
      fallbackRole &&
      (!pickFirstNonEmptyRole(sessionUser.role) ||
        !pickFirstNonEmptyRole(sessionUser.rol))
    ) {
      return {
        ...sessionUser,
        role: pickFirstNonEmptyRole(sessionUser.role) || fallbackRole,
        rol: pickFirstNonEmptyRole(sessionUser.rol) || fallbackRole,
      };
    }
    return sessionUser;
  }

  const rawStored = authService.getStorageItem("user");
  if (!rawStored) return null;

  try {
    const parsed = JSON.parse(rawStored) as SessionUserLike;
    if (!parsed || typeof parsed !== "object") return null;
    const fallbackRole = pickFirstNonEmptyRole(
      parsed.role,
      parsed.rol,
      parsed.tipo,
      session?.role,
    );
    if (
      fallbackRole &&
      (!pickFirstNonEmptyRole(parsed.role) || !pickFirstNonEmptyRole(parsed.rol))
    ) {
      return {
        ...parsed,
        role: pickFirstNonEmptyRole(parsed.role) || fallbackRole,
        rol: pickFirstNonEmptyRole(parsed.rol) || fallbackRole,
      };
    }
    return parsed;
  } catch {
    return null;
  }
}

export function resolveUserRole(
  user: SessionUserLike | null | undefined,
  sessionRole?: unknown,
): AppUserRole | null {
  if (!user && !pickFirstNonEmptyRole(sessionRole)) return null;

  const explicitRole = pickFirstNonEmptyRole(
    sessionRole,
    user?.role,
    user?.rol,
    user?.tipo,
    user?.userRole,
    user?.user_role,
  );
  if (isLandlordRole(explicitRole)) return "arrendatario";
  if (isTenantRole(explicitRole)) return "inquilino";

  const hasLandlordId = Boolean(
    pickValidId(
      user?.id_arrendatario,
      user?.idArrendatario,
      user?.arrendatario_id,
      user?.id_arrendador,
    ),
  );
  const hasTenantId = hasValidId(user?.id_inquilino);

  if (hasLandlordId && !hasTenantId) {
    return "arrendatario";
  }
  if (hasTenantId && !hasLandlordId) {
    return "inquilino";
  }

  return null;
}

export function getLandlordId(
  user: SessionUserLike | null | undefined,
  sessionRole?: unknown,
): string | number | null {
  if (!user) return null;
  const directId = pickValidId(
    user.id_arrendatario,
    user.idArrendatario,
    user.arrendatario_id,
    user.id_arrendador,
  );
  if (directId !== null) {
    return directId;
  }
  const role = resolveUserRole(user, sessionRole);
  if (role === "arrendatario") {
    return pickValidId(
      user.id,
      user.id_usuario,
      user.idUsuario,
      user.usuario_id,
      user.userId,
      user.user_id,
    );
  }
  return null;
}

export function getTenantId(
  user: SessionUserLike | null | undefined,
  sessionRole?: unknown,
): string | number | null {
  if (!user) return null;
  if (hasValidId(user.id_inquilino)) {
    return user.id_inquilino;
  }
  const role = resolveUserRole(user, sessionRole);
  if (role === "arrendatario") {
    return null;
  }
  return pickValidId(
    user.id,
    user.id_usuario,
    user.idUsuario,
    user.usuario_id,
    user.userId,
    user.user_id,
  );
}
