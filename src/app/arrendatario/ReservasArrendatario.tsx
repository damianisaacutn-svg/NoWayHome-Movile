// src/screens/ReservasArrendatarioScreen.tsx
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  CircleDollarSign,
  Clock3,
  DollarSign,
  Mail,
  Phone,
  UserRound,
  XCircle,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Componentes y utilidades móviles
import { API_BASE_URL } from '@/config/api';
import { authService } from '@/services/authService';
import {
  extraerTituloPropiedadDeReserva,
  notificarCambioEstadoPorArrendatario,
} from '@/services/notificationSyncService';
import {
  getLandlordId,
  getStoredSessionUser as getSessionUserFromStorage,
  getTenantId,
  hasValidId,
  resolveUserRole,
} from '@/utils/sessionRole';
import { AlertMessage } from '../../components/AlertMessage';
import { BottomTabBar } from '../../components/BottomTabBar';
import { CancelBookingModal } from '../../components/CancelBookingModal';
import { EmptyState } from '../../components/EmptyState';
import { HeaderArrendatario } from '../../components/headerArrendatario';
import { LoadingState } from '../../components/LoadingState';
import { landlordBookingService } from '../../services/landlordBookingService';
import { formatDateLong, parseDateOnly } from '../../utils/dateUtils';
import { PLACEHOLDER_PROPERTY_IMAGE } from '../inquilino/constants';

// ---------------------------------------------------------------------------
// TIPOS E INTERFACES
// ---------------------------------------------------------------------------

export interface InquilinoData {
  id?: string | number;
  nombre?: string;
  correo?: string;
  telefono?: string | null;
  [key: string]: unknown;
}

export interface PropiedadData {
  id?: string | number;
  titulo?: string;
  nombre?: string;
  descripcion?: string;
  imagen_principal?: string;
  [key: string]: unknown;
}

export interface ReservaItem {
  id_reserva?: string | number;
  id_propiedad?: string | number;
  id_inquilino?: string | number;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: string;
  total?: number | string;
  pago?: number | string;
  precio_total?: number | string;
  total_pagado?: number | string;
  titulo_propiedad?: string;
  imagen_principal?: string;
  nombre_inquilino?: string;
  correo_inquilino?: string;
  telefono_inquilino?: string | null;
  estado_pago?: string;
  estadoPago?: string;
  pago_estado?: string;
  payment_status?: string;
  inquilino?: InquilinoData;
  propiedad?: PropiedadData;
  [key: string]: unknown;
}

export interface UserSessionData {
  id?: string | number;
  id_arrendatario?: string | number;
  role?: string;
  rol?: string;
  [key: string]: unknown;
}

export interface EstadoStyleConfig {
  label: string;
  bg: string;
  text?: string;
  badge: string;
  card: string;
}

export interface FeedbackState {
  type: 'success' | 'error' | '';
  title: string;
  text: string;
}

export interface MessageState {
  type: 'success' | 'error' | 'warning' | 'info' | '';
  title: string;
  text: string;
}

export interface PendingActionState {
  reserva: ReservaItem;
  nuevoEstado: string;
  idReserva: number;
}

export interface ReservationSummary {
  pendientes: number;
  confirmadas: number;
  finalizadas: number;
  totalEstimado: number;
}

// ---------------------------------------------------------------------------
// CONSTANTES Y ESTILOS
// ---------------------------------------------------------------------------

const ESTADO_STYLES: Record<string, EstadoStyleConfig> = {
  PENDIENTE: {
    label: 'Pendiente',
    bg: 'bg-[#F5F2EC]',
    text: 'text-[#B87333]',
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
    card: 'bg-[#F5F2EC] border-[#DCDCDC]',
  },
  CONFIRMADA: {
    label: 'Confirmada',
    bg: 'bg-white',
    text: 'text-[#B8860B]',
    badge: 'bg-[#B8860B]/15 text-[#B8860B] border-[#B8860B]/30',
    card: 'bg-white border-[#DCDCDC]',
  },
  RECHAZADA: {
    label: 'Rechazada',
    bg: 'bg-white',
    text: 'text-red-700',
    badge: 'bg-red-50 text-red-700 border-red-200',
    card: 'bg-white border-red-200',
  },
  CANCELADA: {
    label: 'Cancelada',
    bg: 'bg-white',
    text: 'text-[#595959]',
    badge: 'bg-[#DCDCDC]/50 text-[#1C1C1C] border-[#DCDCDC]',
    card: 'bg-white border-[#DCDCDC]',
  },
  pendiente: {
    card: 'bg-[#F5F2EC] border-[#DCDCDC]',
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
    label: 'Pendiente',
    bg: 'bg-[#F5F2EC]',
  },
  confirmada: {
    card: 'bg-white border-[#DCDCDC]',
    badge: 'bg-[#B8860B]/15 text-[#B8860B] border-[#B8860B]/30',
    label: 'Confirmada',
    bg: 'bg-white',
  },
  rechazada: {
    card: 'bg-white border-red-200',
    badge: 'bg-red-50 text-red-700 border-red-200',
    label: 'Rechazada',
    bg: 'bg-white',
  },
  cancelada: {
    card: 'bg-white border-[#DCDCDC]',
    badge: 'bg-[#DCDCDC]/50 text-[#1C1C1C] border-[#DCDCDC]',
    label: 'Cancelada',
    bg: 'bg-white',
  },
  default: {
    label: 'Desconocido',
    bg: 'bg-white',
    text: 'text-[#1C1C1C]',
    badge: 'bg-[#DCDCDC] text-[#1C1C1C] border-[#DCDCDC]',
    card: 'bg-white border-[#DCDCDC]',
  },
};

const FILTERS = [
  { value: 'todas', label: 'Todos' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'confirmada', label: 'Confirmadas' },
  { value: 'rechazada', label: 'Rechazadas' },
  { value: 'cancelada', label: 'Canceladas' },
];

const ESTADO_ORDER: Record<string, number> = {
  pendiente: 1,
  confirmada: 2,
  rechazada: 3,
  cancelada: 4,
};

const normalizeStatus = (estado?: string): string => String(estado || '').toLowerCase();

const getReservaTotal = (reserva: ReservaItem): number => {
  const total = Number(
    reserva.total ?? reserva.pago ?? reserva.precio_total ?? reserva.total_pagado ?? 0
  );
  return Number.isFinite(total) ? total : 0;
};

function resolveImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return PLACEHOLDER_PROPERTY_IMAGE;
  const trimmed = rawUrl.trim();
  if (!trimmed) return PLACEHOLDER_PROPERTY_IMAGE;
  if (/^(https?:\/\/|data:image\/)/i.test(trimmed)) return trimmed;
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------------------------

export function ReservasArrendatario() {
  const router = useRouter();

  const [reservas, setReservas] = useState<ReservaItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<MessageState>({ type: '', title: '', text: '' });
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('todas');
  const [pendingAction, setPendingAction] = useState<PendingActionState | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [actionFeedback, setActionFeedback] = useState<FeedbackState>({
    type: '',
    title: '',
    text: '',
  });
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const hasFocusedOnceRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }
      setRefreshTrigger((prev) => prev + 1);
    }, []),
  );

  useEffect(() => {
    let isMounted = true;

    const fetchReservas = async () => {
      try {
        const session = authService.getSession();
        const user = getSessionUserFromStorage() as UserSessionData | null;
        if (!session?.isAuthenticated || !user) {
          return;
        }

        const role = resolveUserRole(user, session?.role);
        const idArrendatario = getLandlordId(user, session?.role);
        const tenantId = getTenantId(user, session?.role);
        if (
          role === 'inquilino' &&
          !hasValidId(user?.id_arrendatario) &&
          hasValidId(tenantId)
        ) {
          router.replace('/inquilino/profileInquilino' as any);
          return;
        }

        if ((role !== 'arrendatario' && !hasValidId(user?.id_arrendatario)) || !hasValidId(idArrendatario)) {
          if (isMounted) {
            setError('No se pudo identificar tu cuenta de arrendatario.');
            setIsLoading(false);
          }
          return;
        }

        if (isMounted) {
          setError('');
        }
        const result = await landlordBookingService.obtenerReservasRecibidas(idArrendatario);
        if (isMounted) {
          setReservas(Array.isArray(result) ? result : []);
        }
      } catch {
        if (isMounted) {
          setError('No se pudieron cargar las reservas. Intenta nuevamente.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchReservas();

    return () => {
      isMounted = false;
    };
  }, [router, refreshTrigger]);

  const closeActionModal = () => {
    if (processingId) return;
    setPendingAction(null);
    setRejectReason('');
    setActionFeedback({ type: '', title: '', text: '' });
  };

  const openActionModal = (reserva: ReservaItem, nuevoEstado: string) => {
    const parsedIdReserva = Number(reserva.id_reserva);
    if (!Number.isInteger(parsedIdReserva) || parsedIdReserva <= 0) {
      setMessage({
        type: 'error',
        title: 'Reserva invalida',
        text: 'No se puede actualizar esta reserva porque no tiene id_reserva valido.',
      });
      return false;
    }

    setMessage({ type: '', title: '', text: '' });
    setPendingAction({ reserva, nuevoEstado, idReserva: parsedIdReserva });
    setRejectReason('');
    setActionFeedback({ type: '', title: '', text: '' });
  };

  const handleEstadoChange = async (
    idReserva: number | string,
    nuevoEstado: string,
    motivo = ''
  ): Promise<boolean> => {
    const parsedIdReserva = Number(idReserva);
    if (!Number.isInteger(parsedIdReserva) || parsedIdReserva <= 0) {
      setMessage({
        type: 'error',
        title: 'Reserva inválida',
        text: 'No se puede actualizar esta reserva porque no tiene id_reserva válido.',
      });
      return false;
    }

    const session = authService.getSession();
    const user = getSessionUserFromStorage() as UserSessionData | null;
    if (!session?.isAuthenticated || !user) {
      setMessage({
        type: 'error',
        title: 'Sesión inválida',
        text: 'Inicia sesión nuevamente para actualizar reservas.',
      });
      return false;
    }

    const role = resolveUserRole(user, session?.role);
    const idArrendatario = getLandlordId(user, session?.role);

    if ((role !== 'arrendatario' && !hasValidId(user?.id_arrendatario)) || !hasValidId(idArrendatario)) {
      setMessage({
        type: 'error',
        title: 'Datos incompletos',
        text: 'No se pudo identificar tu cuenta de arrendatario.',
      });
      return false;
    }

    setProcessingId(parsedIdReserva);
    setMessage({ type: '', title: '', text: '' });

    try {
      const targetReserva = reservas.find(
        (reserva) => Number(reserva.id_reserva) === parsedIdReserva,
      );

      await landlordBookingService.cambiarEstadoReserva(
        parsedIdReserva,
        idArrendatario,
        nuevoEstado,
        motivo
      );

      setReservas((prev) =>
        prev.map((reserva) =>
          Number(reserva.id_reserva) === parsedIdReserva
            ? { ...reserva, estado: nuevoEstado }
            : reserva
        )
      );

      const mensajes: Record<string, string> = {
        CONFIRMADA: 'Reserva confirmada correctamente.',
        RECHAZADA: 'Reserva rechazada correctamente.',
        CANCELADA: 'Reserva cancelada correctamente.',
        confirmada: 'Reserva confirmada correctamente.',
        rechazada: 'Reserva rechazada correctamente.',
        cancelada: 'Reserva cancelada correctamente.',
      };

      setActionFeedback({
        type: 'success',
        title: 'Éxito',
        text: mensajes[nuevoEstado] || 'Estado actualizado correctamente.',
      });

      notificarCambioEstadoPorArrendatario({
        idReserva: parsedIdReserva,
        idArrendatario,
        nuevoEstado,
        tituloPropiedad: extraerTituloPropiedadDeReserva(targetReserva),
      });
      return true;
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'No se pudo actualizar la reserva. Intenta nuevamente.';
      setActionFeedback({
        type: 'error',
        title: 'Error',
        text: errorMsg,
      });
      return false;
    } finally {
      setProcessingId(null);
    }
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;

    if (
      ['cancelada', 'rechazada'].includes(String(pendingAction.nuevoEstado).toLowerCase()) &&
      !rejectReason.trim()
    ) {
      setActionFeedback({
        type: 'error',
        title: 'Motivo requerido',
        text: 'Debes proporcionar un motivo para continuar.',
      });
      return;
    }

    const wasUpdated = await handleEstadoChange(
      pendingAction.idReserva,
      pendingAction.nuevoEstado,
      rejectReason
    );
    if (wasUpdated) {
      setRejectReason('');
    }
  };

  const confirmCancellation = async (reason: string) => {
    if (!pendingAction || processingId) return;
    setActionFeedback({ type: '', title: '', text: '' });
    const wasUpdated = await handleEstadoChange(
      pendingAction.idReserva,
      pendingAction.nuevoEstado,
      reason
    );
    if (wasUpdated) closeActionModal();
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price || 0);
  };

  const calculateNights = (inicio?: string, fin?: string): number => {
    if (!inicio || !fin) return 0;
    const start = parseDateOnly(inicio) || new Date(inicio);
    const end = parseDateOnly(fin) || new Date(fin);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const reservationSummary: ReservationSummary = useMemo(() => {
    return reservas.reduce<ReservationSummary>(
      (acc, reserva) => {
        const estado = normalizeStatus(reserva.estado);
        const total = getReservaTotal(reserva);

        if (estado === 'pendiente') acc.pendientes += 1;
        if (estado === 'confirmada') acc.confirmadas += 1;
        if (estado === 'rechazada' || estado === 'cancelada') acc.finalizadas += 1;
        if (estado === 'confirmada' || estado === 'pendiente') acc.totalEstimado += total;

        return acc;
      },
      { pendientes: 0, confirmadas: 0, finalizadas: 0, totalEstimado: 0 }
    );
  }, [reservas]);

  const visibleReservas: ReservaItem[] = useMemo(() => {
    return [...reservas]
      .filter(
        (reserva) => activeFilter === 'todas' || normalizeStatus(reserva.estado) === activeFilter
      )
      .sort((a, b) => {
        const aOrder = ESTADO_ORDER[normalizeStatus(a.estado)] || 99;
        const bOrder = ESTADO_ORDER[normalizeStatus(b.estado)] || 99;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return new Date(b.fecha_inicio || 0).getTime() - new Date(a.fecha_inicio || 0).getTime();
      });
  }, [activeFilter, reservas]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={['top']}>
        <StatusBar style="dark" />
        <HeaderArrendatario />
        <View className="flex-1 bg-[#FAFAFA] items-center justify-center">
          <LoadingState message="Cargando reservas..." className="flex-1" />
        </View>
        <BottomTabBar />
      </SafeAreaView>
    );
  }

  const isConfirmingAction =
    pendingAction?.nuevoEstado === 'confirmada' || pendingAction?.nuevoEstado === 'CONFIRMADA';
  const isRejectingAction =
    pendingAction?.nuevoEstado === 'rechazada' || pendingAction?.nuevoEstado === 'RECHAZADA';
  const isCancellingAction =
    pendingAction?.nuevoEstado === 'cancelada' || pendingAction?.nuevoEstado === 'CANCELADA';

  const modalTitle = isConfirmingAction
    ? 'Confirmar reserva'
    : isRejectingAction
      ? 'Rechazar reserva'
      : 'Cancelar Reserva';
  const modalMessage = isConfirmingAction
    ? '¿Deseas confirmar esta reserva? El inquilino podrá continuar con el proceso correspondiente.'
    : isRejectingAction
      ? '¿Deseas rechazar esta reserva? El inquilino no podrá continuar con esta solicitud.'
      : 'Para cancelar una reserva confirmada, debes indicar el motivo. Esta acción no se puede deshacer.';
  const modalConfirmLabel = processingId
    ? isConfirmingAction
      ? 'Confirmando...'
      : isRejectingAction
        ? 'Rechazando...'
        : 'Cancelando...'
    : isConfirmingAction
      ? 'Sí, confirmar'
      : isRejectingAction
        ? 'Sí, rechazar'
        : 'Sí, cancelar reserva';

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={['top']}>
      <StatusBar style="dark" />
      <HeaderArrendatario />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="flex-1 px-4 py-8">
        <View className="w-full max-w-6xl mx-auto">
          {/* Botón Volver al perfil */}
          <TouchableOpacity
            onPress={() => router.push('/arrendatario/profileArrendatario' as any)}
            className="mb-8 min-h-[44px] flex-row items-center self-start"
          >
            <ArrowLeft size={20} color="#B87333" />
            <Text className="ml-2 font-inter-medium text-[#1C1C1C]">Volver al perfil</Text>
          </TouchableOpacity>

          {/* Encabezado */}
          <View className="mb-8">
            <Text className="font-poppins text-3xl font-semibold text-[#1C1C1C]">Reservas recibidas</Text>
            <Text className="mt-1 font-inter text-sm text-[#595959]">
              Administra las reservas realizadas sobre tus propiedades
            </Text>
          </View>

          {/* Mensajes de Alerta */}
          {message.text ? (
            <AlertMessage
              type={message.type || 'info'}
              title={message.title}
              message={message.text}
              className="mb-6"
            />
          ) : null}

          {error ? (
            <AlertMessage
              type="error"
              title="Error al cargar reservas"
              message={error}
              className="mb-6"
            />
          ) : null}

          {/* Tarjetas de Resumen Numérico */}
          <View className="mb-6 flex-row flex-wrap justify-between gap-3">
            {/* Pendientes */}
            <View className="w-[48%] rounded-xl border border-[#DCDCDC] bg-[#F5F2EC] p-4 shadow-none">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-inter-medium text-xs uppercase tracking-wide text-[#595959]">
                    Pendientes
                  </Text>
                  <Text className="mt-1 font-poppins text-2xl font-semibold text-[#1C1C1C]">
                    {reservationSummary.pendientes}
                  </Text>
                </View>
                <Clock3 size={24} color="#B87333" />
              </View>
            </View>

            {/* Confirmadas */}
            <View className="w-[48%] rounded-xl border border-[#DCDCDC] bg-white p-4 shadow-none">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-inter-medium text-xs uppercase tracking-wide text-[#595959]">
                    Confirmadas
                  </Text>
                  <Text className="mt-1 font-poppins text-2xl font-semibold text-[#1C1C1C]">
                    {reservationSummary.confirmadas}
                  </Text>
                </View>
                <CheckCircle size={24} color="#B8860B" />
              </View>
            </View>

            {/* Rechazadas / Canceladas */}
            <View className="w-[48%] rounded-xl border border-[#DCDCDC] bg-white p-4 shadow-none">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-inter-medium text-xs uppercase tracking-wide text-[#595959]">
                    Rechazadas/Canceladas
                  </Text>
                  <Text className="mt-1 font-poppins text-2xl font-semibold text-[#1C1C1C]">
                    {reservationSummary.finalizadas}
                  </Text>
                </View>
                <XCircle size={24} color="#B87333" />
              </View>
            </View>

            {/* Total estimado */}
            <View className="w-[48%] rounded-xl border border-[#DCDCDC] bg-[#F5F2EC] p-4 shadow-none">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-inter-medium text-xs uppercase tracking-wide text-[#595959]">
                    Total estimado
                  </Text>
                  <Text className="mt-1 font-poppins text-lg font-semibold text-[#B8860B]">
                    {formatPrice(reservationSummary.totalEstimado)}
                  </Text>
                </View>
                <CircleDollarSign size={24} color="#B8860B" />
              </View>
            </View>
          </View>

          {/* Filtros horizontales */}
          {reservas.length > 0 && (
            <View className="mb-6 rounded-xl border border-[#DCDCDC] bg-white p-2">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {FILTERS.map((filter) => {
                  const isActive = activeFilter === filter.value;
                  return (
                    <TouchableOpacity
                      key={filter.value}
                      onPress={() => setActiveFilter(filter.value)}
                      className={`mr-2 min-h-[40px] justify-center rounded-lg px-4 py-2 ${
                        isActive ? 'bg-[#B8860B]' : 'bg-transparent'
                      }`}
                    >
                      <Text
                        className={`font-inter-medium text-sm ${
                          isActive ? 'text-white' : 'text-[#1C1C1C]'
                        }`}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Estados vacíos y lista de reservas */}
          {reservas.length === 0 ? (
            <EmptyState
              title="Aún no tienes reservas"
              message="No hay reservas registradas en tus propiedades por el momento."
            />
          ) : visibleReservas.length === 0 ? (
            <EmptyState
              title="Sin reservas en este filtro"
              message="Prueba con otro estado para revisar el resto de tus reservas recibidas."
            />
          ) : (
            <View className="flex-col gap-6">
              {visibleReservas.map((reserva, index) => {
                const parsedReservaId = Number(reserva.id_reserva);
                const hasValidReservationId =
                  Number.isInteger(parsedReservaId) && parsedReservaId > 0;
                const nights = calculateNights(reserva.fecha_inicio, reserva.fecha_fin);
                const estado = normalizeStatus(reserva.estado);

                const estadoActual = (reserva.estado || 'PENDIENTE').toUpperCase();
                const styles =
                  ESTADO_STYLES[estado] || ESTADO_STYLES[estadoActual] || ESTADO_STYLES.default;

                const fechaInicioFormateada = formatDateLong(reserva.fecha_inicio);
                const fechaFinFormateada = formatDateLong(reserva.fecha_fin);
                const displayFechaInicio =
                  fechaInicioFormateada === 'N/A' ? 'Fecha no disponible' : fechaInicioFormateada;
                const displayFechaFin =
                  fechaFinFormateada === 'N/A' ? 'Fecha no disponible' : fechaFinFormateada;

                const inquilino = reserva.inquilino || {};
                const propiedad = reserva.propiedad || {};

                const tituloPropiedad =
                  reserva.titulo_propiedad ||
                  propiedad.titulo ||
                  propiedad.nombre ||
                  propiedad.descripcion ||
                  'Propiedad sin título';
                const imagenPrincipal = resolveImageUrl(
                  reserva.imagen_principal || propiedad.imagen_principal
                );
                const nombreInquilino =
                  reserva.nombre_inquilino || inquilino.nombre || 'Huésped no disponible';
                const correoInquilino =
                  reserva.correo_inquilino || inquilino.correo || 'No disponible';
                const telefonoInquilino =
                  reserva.telefono_inquilino || inquilino.telefono || null;
                const totalReserva = getReservaTotal(reserva);
                const pagosArray = Array.isArray((reserva as any).pagos)
                  ? ((reserva as any).pagos as Record<string, unknown>[])
                  : [];
                const pagoFromArray =
                  pagosArray.find((p) => p?.estado_pago || p?.estado || p?.id_transaccion_paypal) ||
                  null;
                const localPaidRaw = hasValidReservationId
                  ? authService.getStorageItem(`nowayhome_paid_reserva_${parsedReservaId}`)
                  : null;
                const estadoPago =
                  reserva.estado_pago ||
                  reserva.estadoPago ||
                  reserva.pago_estado ||
                  reserva.payment_status ||
                  (pagoFromArray
                    ? String(pagoFromArray.estado_pago || pagoFromArray.estado || 'Completado')
                    : localPaidRaw
                      ? 'Completado'
                      : undefined);
                const isReservaPaid = Boolean(
                  localPaidRaw ||
                    pagoFromArray?.id_transaccion_paypal ||
                    /completad|completed|confirmad|confirmed|pagad|paid|aprobad|approved/i.test(
                      String(estadoPago || ''),
                    ),
                );

                return (
                  <View
                    key={
                      hasValidReservationId
                        ? `reserva-${parsedReservaId}`
                        : `${reserva.id_propiedad || 'prop'}-${reserva.id_inquilino || 'inq'}-${reserva.fecha_inicio || 'fecha'}-${reserva.fecha_fin || 'fin'}-${index}`
                    }
                    className={`overflow-hidden rounded-2xl border shadow-sm p-5 ${
                      styles.card
                    }`}
                  >
                    {/* Tarjeta Interna */}
                    <View className="flex-col gap-5">
                      {/* Imagen y Título de la Propiedad */}
                      <View>
                        <Image
                          source={{ uri: imagenPrincipal }}
                          className="h-36 w-full rounded-xl"
                          resizeMode="cover"
                        />
                        <View className="mt-3">
                          <Text className="font-inter-medium text-xs text-[#595959]">Propiedad</Text>
                          <Text
                            numberOfLines={2}
                            className="mt-1 font-poppins text-lg font-semibold text-[#1C1C1C]"
                          >
                            {tituloPropiedad}
                          </Text>
                        </View>
                      </View>

                      {/* Datos del Inquilino */}
                      <View className="space-y-3 rounded-xl border border-[#DCDCDC] bg-[#FAFAFA] p-4">
                        <View className="mb-2">
                          <View className="mb-1 flex-row items-center gap-2">
                            <UserRound size={16} color="#B87333" />
                            <Text className="font-inter-medium text-xs text-[#595959]">
                              Inquilino
                            </Text>
                          </View>
                          <Text className="font-inter-semibold text-[#1C1C1C]">{nombreInquilino}</Text>
                        </View>

                        <View className="mb-2">
                          <View className="mb-1 flex-row items-center gap-2">
                            <Mail size={16} color="#B87333" />
                            <Text className="font-inter-medium text-xs text-[#595959]">Correo</Text>
                          </View>
                          <Text className="font-inter text-sm text-[#1C1C1C]">{correoInquilino}</Text>
                        </View>

                        {telefonoInquilino && (
                          <View>
                            <View className="mb-1 flex-row items-center gap-2">
                              <Phone size={16} color="#B87333" />
                              <Text className="font-inter-medium text-xs text-[#595959]">
                                Teléfono
                              </Text>
                            </View>
                            <Text className="font-inter text-sm text-[#1C1C1C]">{telefonoInquilino}</Text>
                          </View>
                        )}
                      </View>

                      {/* Fechas, Total y Acciones */}
                      <View className="space-y-4">
                        <View className="flex-row justify-between mb-3">
                          <View className="flex-1 mr-2">
                            <View className="mb-1 flex-row items-center gap-1">
                              <Calendar size={16} color="#B87333" />
                              <Text className="font-inter-medium text-xs text-[#595959]">Fechas</Text>
                            </View>
                            <Text className="font-inter-medium text-sm text-[#1C1C1C]">
                              {displayFechaInicio} - {displayFechaFin}
                            </Text>
                            <Text className="font-inter text-xs text-[#595959]">{nights} noche(s)</Text>
                          </View>

                          <View className="items-end">
                            <View className="mb-1 flex-row items-center gap-1">
                              <DollarSign size={12} color="#1C1C1C" />
                              <CircleDollarSign size={16} color="#B87333" />
                              <Text className="font-inter-medium text-xs text-[#595959]">Total</Text>
                            </View>
                            <Text className="font-poppins text-lg font-semibold text-[#B8860B]">
                              {formatPrice(totalReserva)}
                            </Text>
                          </View>
                        </View>

                        {/* Badges de Estado y Pago */}
                        <View className="flex-row flex-wrap items-center gap-2 mb-3">
                          <View
                            className={`rounded-full border px-3 py-1 ${styles.badge}`}
                          >
                            <Text className="font-inter-semibold text-xs text-[#1C1C1C]">
                              {styles.label || reserva.estado}
                            </Text>
                          </View>

                          {estadoPago && (
                            <View className="rounded-full border border-[#DCDCDC] bg-white px-3 py-1">
                              <Text className="font-inter-semibold text-xs text-[#1C1C1C]">
                                Pago: {estadoPago}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Aviso Contrato */}
                        <View className="rounded-lg border border-[#DCDCDC] bg-white px-3 py-2">
                          <Text className="font-inter text-xs leading-5 text-[#595959]">
                            {isReservaPaid
                              ? 'Pago confirmado mediante PayPal. La constancia de reserva ya se encuentra activa.'
                              : 'El contrato se generará después del flujo de pago.'}
                          </Text>
                        </View>

                        {!hasValidReservationId && (
                          <View className="rounded-lg border border-red-200 bg-red-50 p-2">
                            <Text className="font-inter text-xs text-red-700">
                              Esta reserva no tiene id_reserva válido. No se pueden ejecutar acciones.
                            </Text>
                          </View>
                        )}

                        {/* Botones de Acción de la Reserva */}
                        {(estado === 'pendiente' ||
                          estado === 'confirmada' ||
                          estadoActual === 'PENDIENTE' ||
                          estadoActual === 'CONFIRMADA') && (
                          <View className="flex-col gap-2 mt-2">
                            {(estado === 'pendiente' || estadoActual === 'PENDIENTE') && (
                              <View className="flex-row gap-2">
                                <TouchableOpacity
                                  onPress={() => openActionModal(reserva, 'confirmada')}
                                  disabled={
                                    !hasValidReservationId || processingId === parsedReservaId
                                  }
                                  className={`flex-1 min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#B8860B] px-3 active:bg-[#9A6F09] ${
                                    !hasValidReservationId || processingId === parsedReservaId
                                      ? 'opacity-60'
                                      : ''
                                  }`}
                                >
                                  <CheckCircle size={16} color="#ffffff" />
                                  <Text className="ml-2 font-inter-medium text-white">Confirmar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => openActionModal(reserva, 'rechazada')}
                                  disabled={
                                    !hasValidReservationId || processingId === parsedReservaId
                                  }
                                  className={`flex-1 min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#DC2626] px-3 active:bg-[#B91C1C] ${
                                    !hasValidReservationId || processingId === parsedReservaId
                                      ? 'opacity-60'
                                      : ''
                                  }`}
                                >
                                  <XCircle size={16} color="#ffffff" />
                                  <Text className="ml-2 font-inter-medium text-white">Rechazar</Text>
                                </TouchableOpacity>
                              </View>
                            )}

                            {(estado === 'confirmada' || estadoActual === 'CONFIRMADA') && (
                              <TouchableOpacity
                                onPress={() => openActionModal(reserva, 'cancelada')}
                                disabled={
                                  !hasValidReservationId || processingId === parsedReservaId
                                }
                                className={`min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#B87333] px-3 active:bg-[#9A5E28] ${
                                  !hasValidReservationId || processingId === parsedReservaId
                                    ? 'opacity-60'
                                    : ''
                                }`}
                              >
                                <AlertCircle size={16} color="#ffffff" />
                                <Text className="ml-2 font-inter-medium text-white">
                                  {processingId === parsedReservaId
                                    ? 'Procesando...'
                                    : 'Cancelar reserva'}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <BottomTabBar />

      {/* Modal de Confirmar / Rechazar Acción */}
      <Modal
        visible={Boolean(pendingAction && !isCancellingAction)}
        transparent
        animationType="fade"
        onRequestClose={closeActionModal}
      >
        <View className="flex-1 items-center justify-center bg-black/45 px-4 py-6">
          <View className="w-full max-w-md rounded-2xl border border-[#DCDCDC] bg-white p-6 shadow-xl">
            <View className="mb-5">
              <Text className="font-poppins text-xl font-semibold text-[#1C1C1C]">{modalTitle}</Text>
              <Text className="mt-2 font-inter text-sm leading-6 text-[#595959]">{modalMessage}</Text>
            </View>

            {actionFeedback.text ? (
              <AlertMessage
                type={actionFeedback.type || 'info'}
                title={actionFeedback.title}
                message={actionFeedback.text}
                className="mb-5"
              />
            ) : null}

            {actionFeedback.type !== 'success' && (isRejectingAction || isCancellingAction) && (
              <View className="mb-5">
                <Text className="font-inter-medium text-sm text-[#1C1C1C] mb-1">
                  {isCancellingAction
                    ? 'Motivo de la cancelación (obligatorio)'
                    : 'Motivo del rechazo (obligatorio)'}
                </Text>
                <TextInput
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={rejectReason}
                  onChangeText={(val) => {
                    setRejectReason(val);
                    if (actionFeedback.type === 'error') {
                      setActionFeedback({ type: '', title: '', text: '' });
                    }
                  }}
                  editable={!Boolean(processingId)}
                  placeholder={
                    isCancellingAction
                      ? 'Ej: El inquilino solicitó cancelar, hubo un imprevisto con la propiedad, etc.'
                      : 'Escribe un motivo breve si deseas conservarlo para seguimiento interno.'
                  }
                  placeholderTextColor="#7A7A7A"
                  className="mt-2 h-28 w-full rounded-xl border border-[#DCDCDC] focus:border-[#B8860B] bg-[#FAFAFA] p-3 font-inter text-sm text-[#1C1C1C]"
                />
              </View>
            )}

            <View className="flex-row justify-end gap-3">
              <TouchableOpacity
                onPress={closeActionModal}
                disabled={Boolean(processingId)}
                className="min-h-[48px] items-center justify-center rounded-xl border-[1.5px] border-[#B8860B] bg-white px-4 active:bg-[#FAFAFA]"
              >
                <Text className="font-inter-medium text-[#B8860B]">
                  {actionFeedback.type === 'success' ? 'Cerrar' : 'Cancelar'}
                </Text>
              </TouchableOpacity>

              {actionFeedback.type !== 'success' && (
                <TouchableOpacity
                  onPress={confirmPendingAction}
                  disabled={Boolean(processingId) || (isRejectingAction && !rejectReason.trim())}
                  className={`min-h-[48px] flex-row items-center justify-center rounded-xl px-4 ${
                    isConfirmingAction
                      ? 'bg-[#B8860B] active:bg-[#9A6F09]'
                      : isRejectingAction
                        ? 'bg-[#DC2626] active:bg-[#B91C1C]'
                        : 'bg-[#B87333] active:bg-[#9A5E28]'
                  } ${
                    Boolean(processingId) || (isRejectingAction && !rejectReason.trim())
                      ? 'opacity-60'
                      : ''
                  }`}
                >
                  {isCancellingAction ? (
                    <AlertCircle size={16} color="#ffffff" />
                  ) : isConfirmingAction ? (
                    <CheckCircle size={16} color="#ffffff" />
                  ) : (
                    <XCircle size={16} color="#ffffff" />
                  )}
                  <Text className="ml-2 font-inter-medium text-white">{modalConfirmLabel}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Específico para Cancelaciones */}
      <CancelBookingModal
        key={
          pendingAction && isCancellingAction
            ? `cancel-${pendingAction.idReserva}`
            : 'cancel-closed'
        }
        open={Boolean(pendingAction && isCancellingAction)}
        onClose={closeActionModal}
        onConfirm={confirmCancellation}
        isLoading={Boolean(processingId)}
        error={actionFeedback.type === 'error' ? actionFeedback.text : ''}
      />
    </SafeAreaView>
  );
}

export default ReservasArrendatario;