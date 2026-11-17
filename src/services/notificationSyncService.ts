import { Platform } from "react-native";

import {
  getLandlordId,
  getStoredSessionUser,
  getTenantId,
  hasValidId,
  resolveUserRole,
  type AppUserRole,
  type SessionUserLike,
} from "../utils/sessionRole";
import { authService } from "./authService";
import { landlordBookingService } from "./landlordBookingService";
import { mostrarNotificacionLocal } from "./localNotificationService";
import { getLandlordProperties } from "./propertyService";
import { tenantService } from "./tenantService";

type BookingSnapshotEntry = {
  estado: string;
  pagado: boolean;
  titulo: string;
};

type BookingSnapshotMap = Record<string, BookingSnapshotEntry>;

type PropertySnapshotEntry = {
  estado: string;
  titulo: string;
};

type PropertySnapshotMap = Record<string, PropertySnapshotEntry>;

type CrossRoleEventType =
  | "pending_created"
  | "confirmed"
  | "rejected"
  | "paid"
  | "cancelled";

interface CrossRoleHint {
  targetRole: AppUserRole;
  reservationId: string;
  event: CrossRoleEventType;
  createdAt: number;
}

const CROSS_ROLE_HINTS_KEY = "nowayhome_notif_cross_role_hints";
const HINT_TTL_MS = 30 * 60 * 1000;
const MAX_HINTS = 50;
const MAX_NOTIFIED_KEYS = 200;

const PAID_STATUS_REGEX =
  /completad|completed|confirmad|confirmed|pagad|paid|aprobad|approved/i;

let inFlightSyncPromise: Promise<void> | null = null;
let snapshotMutationEpoch = 0;

function bumpSnapshotEpoch(): void {
  snapshotMutationEpoch += 1;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = authService.getStorageItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    authService.setStorageItem(key, JSON.stringify(value));
  } catch {
    // Ignorar errores de almacenamiento
  }
}

function getBookingSnapshotKey(role: AppUserRole, userId: string | number): string {
  return `nowayhome_notif_booking_snapshot_${role}_${String(userId).trim()}`;
}

function getPropertySnapshotKey(landlordId: string | number): string {
  return `nowayhome_notif_property_snapshot_${String(landlordId).trim()}`;
}

function getNotifiedEventsKey(role: AppUserRole, userId: string | number): string {
  return `nowayhome_notif_notified_events_${role}_${String(userId).trim()}`;
}

function getNotifiedEventsSet(role: AppUserRole, userId: string | number): Set<string> {
  const list = readJson<string[]>(getNotifiedEventsKey(role, userId), []);
  return new Set(Array.isArray(list) ? list : []);
}

function saveNotifiedEventsSet(
  role: AppUserRole,
  userId: string | number,
  set: Set<string>,
): void {
  const trimmed = Array.from(set).slice(-MAX_NOTIFIED_KEYS);
  writeJson(getNotifiedEventsKey(role, userId), trimmed);
}

function markEventNotified(
  role: AppUserRole,
  userId: string | number,
  eventKey: string,
): boolean {
  const notified = getNotifiedEventsSet(role, userId);
  if (notified.has(eventKey)) {
    return false;
  }
  notified.add(eventKey);
  saveNotifiedEventsSet(role, userId, notified);
  return true;
}

function clearCancellationDedupesForBooking(
  role: AppUserRole,
  userId: string | number,
  reservationId: string,
): void {
  const notified = getNotifiedEventsSet(role, userId);
  if (notified.delete(`booking:${reservationId}:cancelled`)) {
    saveNotifiedEventsSet(role, userId, notified);
  }
}

function loadCrossRoleHints(): CrossRoleHint[] {
  const now = Date.now();
  const hints = readJson<CrossRoleHint[]>(CROSS_ROLE_HINTS_KEY, []);
  if (!Array.isArray(hints)) return [];
  return hints
    .filter(
      (item) =>
        item &&
        (item.targetRole === "inquilino" || item.targetRole === "arrendatario") &&
        typeof item.reservationId === "string" &&
        item.reservationId.trim() !== "" &&
        typeof item.createdAt === "number" &&
        now - item.createdAt < HINT_TTL_MS,
    )
    .slice(-MAX_HINTS);
}

function pushCrossRoleHint(
  targetRole: AppUserRole,
  reservationId: string | number | null | undefined,
  event: CrossRoleEventType,
): void {
  if (!hasValidId(reservationId)) return;
  const cleanId = String(reservationId).trim();
  const current = loadCrossRoleHints().filter(
    (item) =>
      !(
        item.targetRole === targetRole &&
        item.reservationId === cleanId &&
        item.event === event
      ),
  );
  current.push({
    targetRole,
    reservationId: cleanId,
    event,
    createdAt: Date.now(),
  });
  writeJson(CROSS_ROLE_HINTS_KEY, current.slice(-MAX_HINTS));
}

function consumeCrossRoleHints(
  targetRole: AppUserRole,
): Map<string, Set<CrossRoleEventType>> {
  const all = loadCrossRoleHints();
  const matched = new Map<string, Set<CrossRoleEventType>>();
  const remaining: CrossRoleHint[] = [];

  for (const hint of all) {
    if (hint.targetRole === targetRole) {
      const existing = matched.get(hint.reservationId) ?? new Set<CrossRoleEventType>();
      existing.add(hint.event);
      matched.set(hint.reservationId, existing);
    } else {
      remaining.push(hint);
    }
  }

  if (matched.size > 0) {
    writeJson(CROSS_ROLE_HINTS_KEY, remaining);
  }

  return matched;
}

export function normalizarEstadoReserva(rawEstado: unknown): string {
  const upper = String(rawEstado || "PENDIENTE").trim().toUpperCase();
  if (upper === "CONFIRMED" || upper === "CONFIRMADA") return "CONFIRMADA";
  if (upper === "CANCELLED" || upper === "CANCELED" || upper === "CANCELADA") {
    return "CANCELADA";
  }
  if (upper === "REJECTED" || upper === "RECHAZADA") return "RECHAZADA";
  if (upper === "PENDING" || upper === "PENDIENTE") return "PENDIENTE";
  return upper || "PENDIENTE";
}

export function extraerTituloPropiedadDeReserva(
  reserva: Record<string, any> | null | undefined,
): string {
  if (!reserva || typeof reserva !== "object") {
    return "tu alojamiento";
  }
  const prop =
    reserva.propiedad && typeof reserva.propiedad === "object"
      ? (reserva.propiedad as Record<string, any>)
      : null;

  const firstDescLine =
    typeof prop?.descripcion === "string"
      ? prop.descripcion
          .split("\n")
          .map((line: string) => line.trim())
          .find(Boolean) || ""
      : "";

  const candidates = [
    reserva.titulo_propiedad,
    prop?.titulo,
    prop?.nombre,
    firstDescLine,
    reserva.titulo,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return "tu alojamiento";
}

function estaReservaPagadaEnBackend(reserva: Record<string, any>): boolean {
  if (reserva?.pagado === true || Boolean(reserva?.id_transaccion_paypal)) {
    return true;
  }
  const directStatus = String(
    reserva?.estado_pago ||
      reserva?.estadoPago ||
      reserva?.pago_estado ||
      reserva?.payment_status ||
      reserva?.pago?.estado_pago ||
      "",
  ).trim();
  if (directStatus && PAID_STATUS_REGEX.test(directStatus)) {
    return true;
  }

  const pagos = Array.isArray(reserva?.pagos) ? reserva.pagos : [];
  return pagos.some((p: Record<string, any>) => {
    if (!p || typeof p !== "object") return false;
    if (p.id_transaccion_paypal) return true;
    const pagoStatus = String(
      p.estado_pago || p.estado || p.status || "",
    ).trim();
    return Boolean(pagoStatus && PAID_STATUS_REGEX.test(pagoStatus));
  });
}

function buildBookingSnapshot(
  reservas: Record<string, any>[],
): BookingSnapshotMap {
  const map: BookingSnapshotMap = {};
  for (const item of reservas) {
    const rawId = item?.id_reserva ?? item?.id;
    if (!hasValidId(rawId)) continue;
    const id = String(rawId).trim();
    map[id] = {
      estado: normalizarEstadoReserva(item?.estado ?? item?.estado_reserva),
      pagado: estaReservaPagadaEnBackend(item),
      titulo: extraerTituloPropiedadDeReserva(item),
    };
  }
  return map;
}

function normalizePropertyStatus(rawEstado: unknown): string {
  const normalized = String(rawEstado || "activa").trim().toLowerCase();
  return normalized || "activa";
}

function extractPropertyTitle(propiedad: Record<string, any>): string {
  const firstDescLine =
    typeof propiedad?.descripcion === "string"
      ? propiedad.descripcion
          .split("\n")
          .map((line: string) => line.trim())
          .find(Boolean) || ""
      : "";
  const rawTitle =
    propiedad?.titulo ||
    propiedad?.nombre ||
    firstDescLine ||
    "tu propiedad";
  return String(rawTitle).trim() || "tu propiedad";
}

function buildPropertySnapshot(
  propiedades: Record<string, any>[],
): PropertySnapshotMap {
  const map: PropertySnapshotMap = {};
  for (const item of propiedades) {
    const rawId = item?.id_propiedad ?? item?.id;
    if (!hasValidId(rawId)) continue;
    const id = String(rawId).trim();
    map[id] = {
      estado: normalizePropertyStatus(item?.estado),
      titulo: extractPropertyTitle(item),
    };
  }
  return map;
}

// ---------------------------------------------------------------------------
// Eventos locales directos tras acciones del usuario actual
// ---------------------------------------------------------------------------

export function notificarPropiedadCreada(params: {
  idPropiedad?: string | number | null;
  idArrendatario?: string | number | null;
  titulo?: string | null;
  estado?: string | null;
}): void {
  const titulo = String(params.titulo || "tu propiedad").trim() || "tu propiedad";
  bumpSnapshotEpoch();

  if (hasValidId(params.idArrendatario) && hasValidId(params.idPropiedad)) {
    const key = getPropertySnapshotKey(params.idArrendatario);
    const snapshot = readJson<PropertySnapshotMap>(key, {});
    snapshot[String(params.idPropiedad).trim()] = {
      estado: normalizePropertyStatus(params.estado || "activa"),
      titulo,
    };
    writeJson(key, snapshot);
  }

  void mostrarNotificacionLocal(
    "Propiedad dada de alta 🏡",
    `Tu propiedad "${titulo}" fue publicada correctamente.`,
    { screen: "/arrendatario/MisPropiedades" },
  );
}

export function notificarPropiedadActualizada(params: {
  idPropiedad?: string | number | null;
  idArrendatario?: string | number | null;
  titulo?: string | null;
  estadoAnterior?: string | null;
  estadoNuevo?: string | null;
  huboCambioDeEstado?: boolean;
  huboCambioDeDatos?: boolean;
}): void {
  const titulo = String(params.titulo || "tu propiedad").trim() || "tu propiedad";
  const nextStatus = normalizePropertyStatus(params.estadoNuevo || "activa");
  bumpSnapshotEpoch();

  if (hasValidId(params.idArrendatario) && hasValidId(params.idPropiedad)) {
    const key = getPropertySnapshotKey(params.idArrendatario);
    const snapshot = readJson<PropertySnapshotMap>(key, {});
    snapshot[String(params.idPropiedad).trim()] = {
      estado: nextStatus,
      titulo,
    };
    writeJson(key, snapshot);
  }

  if (params.huboCambioDeEstado) {
    const prevStatus = params.estadoAnterior
      ? normalizePropertyStatus(params.estadoAnterior)
      : null;
    const statusText = prevStatus
      ? `"${titulo}" cambió de estado de ${prevStatus} a ${nextStatus}.`
      : `El estado de "${titulo}" cambió a ${nextStatus}.`;

    void mostrarNotificacionLocal(
      "Estado de propiedad actualizado 🔄",
      statusText,
      { screen: "/arrendatario/MisPropiedades" },
    );
  }

  if (params.huboCambioDeDatos || !params.huboCambioDeEstado) {
    void mostrarNotificacionLocal(
      "Propiedad editada ✏️",
      `Los cambios en "${titulo}" se guardaron correctamente.`,
      { screen: "/arrendatario/MisPropiedades" },
    );
  }
}

export function notificarReservaPendienteCreada(params: {
  idReserva?: string | number | null;
  idInquilino?: string | number | null;
  tituloPropiedad?: string | null;
}): void {
  const titulo = String(params.tituloPropiedad || "el alojamiento").trim();
  const cleanId = hasValidId(params.idReserva)
    ? String(params.idReserva).trim()
    : null;
  bumpSnapshotEpoch();

  if (cleanId && hasValidId(params.idInquilino)) {
    const snapshotKey = getBookingSnapshotKey("inquilino", params.idInquilino);
    const snapshot = readJson<BookingSnapshotMap>(snapshotKey, {});
    snapshot[cleanId] = {
      estado: "PENDIENTE",
      pagado: false,
      titulo,
    };
    writeJson(snapshotKey, snapshot);
    markEventNotified("inquilino", params.idInquilino, `booking:${cleanId}:pending_tenant`);
    pushCrossRoleHint("arrendatario", cleanId, "pending_created");
  }

  void mostrarNotificacionLocal(
    "Reserva pendiente registrada ⏳",
    cleanId
      ? `Tu solicitud #${cleanId} para "${titulo}" quedó pendiente de aprobación del anfitrión.`
      : `Tu solicitud para "${titulo}" quedó pendiente de aprobación del anfitrión.`,
    {
      screen: cleanId
        ? `/inquilino/detallesReservaPage?idReserva=${cleanId}`
        : "/inquilino/profileInquilino",
    },
  );
}

export function notificarCambioEstadoPorArrendatario(params: {
  idReserva: string | number;
  idArrendatario: string | number;
  nuevoEstado: string;
  tituloPropiedad?: string | null;
}): void {
  const cleanId = String(params.idReserva).trim();
  const normalizedState = normalizarEstadoReserva(params.nuevoEstado);
  const titulo = String(params.tituloPropiedad || "tu propiedad").trim();
  bumpSnapshotEpoch();

  const snapshotKey = getBookingSnapshotKey("arrendatario", params.idArrendatario);
  const snapshot = readJson<BookingSnapshotMap>(snapshotKey, {});
  const prev = snapshot[cleanId];
  snapshot[cleanId] = {
    estado: normalizedState,
    pagado: prev?.pagado ?? false,
    titulo: titulo || prev?.titulo || "tu propiedad",
  };
  writeJson(snapshotKey, snapshot);

  if (normalizedState === "CONFIRMADA") {
    markEventNotified(
      "arrendatario",
      params.idArrendatario,
      `booking:${cleanId}:confirmed_landlord`,
    );
    pushCrossRoleHint("inquilino", cleanId, "confirmed");
    void mostrarNotificacionLocal(
      "Reserva aceptada ✅",
      `Aceptaste la reserva #${cleanId} para "${titulo}". El inquilino ya puede realizar el pago.`,
      { screen: "/arrendatario/ReservasArrendatario" },
    );
    return;
  }

  if (normalizedState === "RECHAZADA") {
    markEventNotified(
      "arrendatario",
      params.idArrendatario,
      `booking:${cleanId}:rejected_landlord`,
    );
    pushCrossRoleHint("inquilino", cleanId, "rejected");
    void mostrarNotificacionLocal(
      "Reserva rechazada",
      `Rechazaste la solicitud de reserva #${cleanId} para "${titulo}".`,
      { screen: "/arrendatario/ReservasArrendatario" },
    );
    return;
  }

  if (normalizedState === "CANCELADA") {
    markEventNotified(
      "arrendatario",
      params.idArrendatario,
      `booking:${cleanId}:cancelled`,
    );
    pushCrossRoleHint("inquilino", cleanId, "cancelled");
    void mostrarNotificacionLocal(
      "Reserva cancelada ❌",
      `Cancelaste la reserva #${cleanId} para "${titulo}".`,
      { screen: "/arrendatario/ReservasArrendatario" },
    );
  }
}

export function notificarPagoConfirmadoInquilino(params: {
  idReserva: string | number;
  idInquilino?: string | number | null;
  tituloPropiedad?: string | null;
}): void {
  const cleanId = String(params.idReserva).trim();
  const titulo = String(params.tituloPropiedad || "tu alojamiento").trim();
  bumpSnapshotEpoch();

  if (hasValidId(params.idInquilino)) {
    const snapshotKey = getBookingSnapshotKey("inquilino", params.idInquilino);
    const snapshot = readJson<BookingSnapshotMap>(snapshotKey, {});
    snapshot[cleanId] = {
      estado: "CONFIRMADA",
      pagado: true,
      titulo,
    };
    writeJson(snapshotKey, snapshot);
    markEventNotified("inquilino", params.idInquilino, `booking:${cleanId}:paid_tenant`);
  }

  pushCrossRoleHint("arrendatario", cleanId, "paid");

  void mostrarNotificacionLocal(
    "¡Pago confirmado en No Way Home! ✅",
    `Tu reserva #${cleanId} para "${titulo}" está confirmada y tu constancia ya está disponible.`,
    { screen: `/inquilino/detallesReservaPage?idReserva=${cleanId}` },
  );
}

export function notificarReservaCanceladaPorInquilino(params: {
  idReserva: string | number;
  idInquilino?: string | number | null;
  tituloPropiedad?: string | null;
  isPaid?: boolean;
  redirectScreen?: string;
}): void {
  const cleanId = String(params.idReserva).trim();
  const titulo = String(params.tituloPropiedad || "tu alojamiento").trim();
  bumpSnapshotEpoch();

  if (hasValidId(params.idInquilino)) {
    const snapshotKey = getBookingSnapshotKey("inquilino", params.idInquilino);
    const snapshot = readJson<BookingSnapshotMap>(snapshotKey, {});
    const prev = snapshot[cleanId];
    snapshot[cleanId] = {
      estado: "CANCELADA",
      pagado: prev?.pagado ?? Boolean(params.isPaid),
      titulo,
    };
    writeJson(snapshotKey, snapshot);
    markEventNotified("inquilino", params.idInquilino, `booking:${cleanId}:cancelled`);
  }

  pushCrossRoleHint("arrendatario", cleanId, "cancelled");

  void mostrarNotificacionLocal(
    "Reserva cancelada ❌",
    params.isPaid
      ? `La reserva #${cleanId} (${titulo}) fue cancelada. El reembolso se gestionará próximamente.`
      : `Tu reserva #${cleanId} para "${titulo}" ha sido cancelada.`,
    {
      screen:
        params.redirectScreen ||
        `/inquilino/detallesReservaPage?idReserva=${cleanId}`,
    },
  );
}

// ---------------------------------------------------------------------------
// Sincronización periódica y reactiva contra el backend (eventos entrantes)
// ---------------------------------------------------------------------------

async function syncLandlordEvents(landlordId: string | number): Promise<void> {
  const startEpoch = snapshotMutationEpoch;
  const [reservasRes, propsRes] = await Promise.allSettled([
    landlordBookingService.obtenerReservasRecibidas(landlordId),
    getLandlordProperties(landlordId),
  ]);

  if (startEpoch !== snapshotMutationEpoch) {
    return;
  }

  if (reservasRes.status === "fulfilled" && Array.isArray(reservasRes.value)) {
    const reservas = reservasRes.value as Record<string, any>[];
    const snapshotKey = getBookingSnapshotKey("arrendatario", landlordId);
    const hasBaseline = Boolean(authService.getStorageItem(snapshotKey));
    const previousSnapshot = hasBaseline
      ? readJson<BookingSnapshotMap>(snapshotKey, {})
      : null;
    const hints = consumeCrossRoleHints("arrendatario");
    const nextSnapshot = buildBookingSnapshot(reservas);

    for (const [id, current] of Object.entries(nextSnapshot)) {
      const prev = previousSnapshot ? previousSnapshot[id] : undefined;
      const hintEvents = hints.get(id);

      // 1) Nueva reserva pendiente recibida por el arrendatario
      const arrivedAsPending = previousSnapshot
        ? current.estado === "PENDIENTE" &&
          (!prev || prev.estado !== "PENDIENTE")
        : Boolean(hintEvents?.has("pending_created") && current.estado === "PENDIENTE");

      if (
        arrivedAsPending &&
        markEventNotified("arrendatario", landlordId, `booking:${id}:pending_landlord`)
      ) {
        clearCancellationDedupesForBooking("arrendatario", landlordId, id);
        await mostrarNotificacionLocal(
          "Nueva reserva pendiente 🏡",
          `Recibiste una nueva solicitud de reserva (#${id}) para "${current.titulo}".`,
          { screen: "/arrendatario/ReservasArrendatario" },
        );
      }

      // 2) Pago recibido por el arrendatario desde el inquilino
      const arrivedAsPaid = previousSnapshot
        ? current.pagado && (!prev || !prev.pagado)
        : Boolean(hintEvents?.has("paid") && current.pagado);

      if (
        arrivedAsPaid &&
        markEventNotified("arrendatario", landlordId, `booking:${id}:paid_landlord`)
      ) {
        await mostrarNotificacionLocal(
          "¡Pago recibido! 💰",
          `El inquilino realizó el pago de la reserva #${id} para "${current.titulo}".`,
          { screen: "/arrendatario/ReservasArrendatario" },
        );
      }

      // 3) Reserva cancelada por el inquilino
      const arrivedAsCancelled = previousSnapshot
        ? current.estado === "CANCELADA" &&
          Boolean(prev && prev.estado !== "CANCELADA")
        : Boolean(hintEvents?.has("cancelled") && current.estado === "CANCELADA");

      if (
        arrivedAsCancelled &&
        markEventNotified("arrendatario", landlordId, `booking:${id}:cancelled`)
      ) {
        await mostrarNotificacionLocal(
          "Reserva cancelada ❌",
          `El inquilino canceló la reserva #${id} para "${current.titulo}".`,
          { screen: "/arrendatario/ReservasArrendatario" },
        );
      }
    }

    writeJson(snapshotKey, nextSnapshot);
  }

  if (propsRes.status === "fulfilled" && Array.isArray(propsRes.value)) {
    const propiedades = propsRes.value as Record<string, any>[];
    const propKey = getPropertySnapshotKey(landlordId);
    const hasPropBaseline = Boolean(authService.getStorageItem(propKey));
    const prevPropSnapshot = hasPropBaseline
      ? readJson<PropertySnapshotMap>(propKey, {})
      : null;
    const nextPropSnapshot = buildPropertySnapshot(propiedades);

    if (prevPropSnapshot) {
      for (const [propId, current] of Object.entries(nextPropSnapshot)) {
        const prev = prevPropSnapshot[propId];
        if (prev && prev.estado !== current.estado) {
          await mostrarNotificacionLocal(
            "Estado de propiedad actualizado 🔄",
            `Tu propiedad "${current.titulo}" cambió de ${prev.estado} a ${current.estado}.`,
            { screen: "/arrendatario/MisPropiedades" },
          );
        }
      }
    }

    writeJson(propKey, nextPropSnapshot);
  }
}

async function syncTenantEvents(tenantId: string | number): Promise<void> {
  const startEpoch = snapshotMutationEpoch;
  const reservas = (await tenantService.obtenerReservas(
    tenantId,
  )) as Record<string, any>[];
  if (!Array.isArray(reservas) || startEpoch !== snapshotMutationEpoch) return;

  const snapshotKey = getBookingSnapshotKey("inquilino", tenantId);
  const hasBaseline = Boolean(authService.getStorageItem(snapshotKey));
  const previousSnapshot = hasBaseline
    ? readJson<BookingSnapshotMap>(snapshotKey, {})
    : null;
  const hints = consumeCrossRoleHints("inquilino");
  const nextSnapshot = buildBookingSnapshot(reservas);

  for (const [id, current] of Object.entries(nextSnapshot)) {
    const prev = previousSnapshot ? previousSnapshot[id] : undefined;
    const hintEvents = hints.get(id);

    // 1) Aceptación recibida por el inquilino
    const arrivedAsConfirmed = previousSnapshot
      ? current.estado === "CONFIRMADA" &&
        (!prev || prev.estado === "PENDIENTE")
      : Boolean(hintEvents?.has("confirmed") && current.estado === "CONFIRMADA");

    if (
      arrivedAsConfirmed &&
      markEventNotified("inquilino", tenantId, `booking:${id}:confirmed_tenant`)
    ) {
      await mostrarNotificacionLocal(
        "¡Reserva aceptada! 🎉",
        `Tu reserva #${id} para "${current.titulo}" fue aceptada. Ya puedes proceder con el pago.`,
        { screen: `/inquilino/detallesReservaPage?idReserva=${id}` },
      );
    }

    // 2) Rechazo recibido por el inquilino
    const arrivedAsRejected = previousSnapshot
      ? current.estado === "RECHAZADA" &&
        Boolean(prev && prev.estado !== "RECHAZADA")
      : Boolean(hintEvents?.has("rejected") && current.estado === "RECHAZADA");

    if (
      arrivedAsRejected &&
      markEventNotified("inquilino", tenantId, `booking:${id}:rejected_tenant`)
    ) {
      await mostrarNotificacionLocal(
        "Solicitud de reserva rechazada",
        `El anfitrión rechazó tu solicitud #${id} para "${current.titulo}".`,
        { screen: `/inquilino/detallesReservaPage?idReserva=${id}` },
      );
    }

    // 3) Cancelación realizada por el arrendatario
    const arrivedAsCancelled = previousSnapshot
      ? current.estado === "CANCELADA" &&
        Boolean(prev && prev.estado !== "CANCELADA")
      : Boolean(hintEvents?.has("cancelled") && current.estado === "CANCELADA");

    if (
      arrivedAsCancelled &&
      markEventNotified("inquilino", tenantId, `booking:${id}:cancelled`)
    ) {
      await mostrarNotificacionLocal(
        "Reserva cancelada ❌",
        `Tu reserva #${id} para "${current.titulo}" fue cancelada por el anfitrión.`,
        { screen: `/inquilino/detallesReservaPage?idReserva=${id}` },
      );
    }
  }

  writeJson(snapshotKey, nextSnapshot);
}

export async function sincronizarNotificacionesDeUsuario(
  sessionOverride?: {
    isAuthenticated?: boolean;
    user?: SessionUserLike | null;
    role?: string | null;
  } | null,
): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  if (inFlightSyncPromise) {
    return inFlightSyncPromise;
  }

  const session = sessionOverride ?? authService.getSession();
  if (!session?.isAuthenticated) {
    return;
  }

  const user =
    (session.user as SessionUserLike | null) || getStoredSessionUser();
  if (!user) {
    return;
  }

  const role = resolveUserRole(user, session.role);
  if (!role) {
    return;
  }

  const run = async () => {
    try {
      if (role === "arrendatario") {
        const landlordId = getLandlordId(user, session.role);
        if (hasValidId(landlordId)) {
          await syncLandlordEvents(landlordId);
        }
      } else if (role === "inquilino") {
        const tenantId = getTenantId(user, session.role);
        if (hasValidId(tenantId)) {
          await syncTenantEvents(tenantId);
        }
      }
    } catch {
      // Silenciar errores transitorios de red en polling en segundo plano
    } finally {
      inFlightSyncPromise = null;
    }
  };

  inFlightSyncPromise = run();
  return inFlightSyncPromise;
}
