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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  getLandlordId,
  getStoredSessionUser as getSessionUserFromStorage,
  resolveUserRole,
} from '@/utils/sessionRole';
import { AlertMessage } from '../../components/AlertMessage';
import { CancelBookingModal } from '../../components/CancelBookingModal';
import { EmptyState } from '../../components/EmptyState';
import { HeaderArrendatario } from '../../components/headerArrendatario';
import { LoadingState } from '../../components/LoadingState';
import { landlordBookingService } from '../../services/landlordBookingService';
import { formatDateLong } from '../../utils/dateUtils';
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
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    badge: 'bg-amber-200 text-amber-900',
    card: 'bg-[#F2E8CF] border-[#A67C52]/20',
  },
  CONFIRMADA: {
    label: 'Confirmada',
    bg: 'bg-green-50',
    text: 'text-green-800',
    badge: 'bg-green-200 text-green-900',
    card: 'bg-white border-[#6B8E23]/15',
  },
  RECHAZADA: {
    label: 'Rechazada',
    bg: 'bg-gray-50',
    text: 'text-gray-800',
    badge: 'bg-gray-200 text-gray-900',
    card: 'bg-white border-red-100',
  },
  CANCELADA: {
    label: 'Cancelada',
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    badge: 'bg-gray-100 text-gray-700 border-gray-200',
    card: 'bg-white border-[#5F5F5F]/10',
  },
  pendiente: {
    card: 'bg-[#F2E8CF] border-[#A67C52]/20',
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
    label: 'Pendiente',
    bg: 'bg-amber-50',
  },
  confirmada: {
    card: 'bg-white border-[#6B8E23]/15',
    badge: 'bg-green-100 text-green-800 border-green-200',
    label: 'Confirmada',
    bg: 'bg-green-50',
  },
  rechazada: {
    card: 'bg-white border-red-100',
    badge: 'bg-red-50 text-red-700 border-red-100',
    label: 'Rechazada',
    bg: 'bg-gray-50',
  },
  cancelada: {
    card: 'bg-white border-[#5F5F5F]/10',
    badge: 'bg-gray-100 text-gray-700 border-gray-200',
    label: 'Cancelada',
    bg: 'bg-gray-50',
  },
  default: {
    label: 'Desconocido',
    bg: 'bg-gray-50',
    text: 'text-gray-800',
    badge: 'bg-gray-200 text-gray-900',
    card: 'bg-white border-[#5F5F5F]/10',
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

  useFocusEffect(
    useCallback(() => {
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
          router.replace('/' as any);
          return;
        }

        const role = resolveUserRole(user, session?.role);
        const idArrendatario = getLandlordId(user, session?.role);
        if (role !== 'arrendatario' && !user?.id_arrendatario) {
          router.replace('/inquilino/profileInquilino' as any);
          return;
        }

        if (!idArrendatario) {
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

    if ((role !== 'arrendatario' && !user?.id_arrendatario) || !idArrendatario) {
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
    const start = new Date(inicio);
    const end = new Date(fin);
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
            className="mb-8 flex-row items-center self-start"
          >
            <ArrowLeft size={20} color="#5F5F5F" />
            <Text className="ml-2 font-medium text-[#5F5F5F]">Volver al perfil</Text>
          </TouchableOpacity>

          {/* Encabezado */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-[#5F5F5F]">Reservas recibidas</Text>
            <Text className="mt-1 text-sm text-[#5F5F5F]/70">
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
            <View className="w-[48%] rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-none">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-medium uppercase tracking-wide text-[#5F5F5F]/65">
                    Pendientes
                  </Text>
                  <Text className="mt-1 text-2xl font-semibold text-[#5F5F5F]">
                    {reservationSummary.pendientes}
                  </Text>
                </View>
                <Clock3 size={24} color="#A67C52" />
              </View>
            </View>

            {/* Confirmadas */}
            <View className="w-[48%] rounded-xl border border-[#6B8E23]/15 bg-white p-4 shadow-none">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-medium uppercase tracking-wide text-[#5F5F5F]/65">
                    Confirmadas
                  </Text>
                  <Text className="mt-1 text-2xl font-semibold text-[#5F5F5F]">
                    {reservationSummary.confirmadas}
                  </Text>
                </View>
                <CheckCircle size={24} color="#6B8E23" />
              </View>
            </View>

            {/* Rechazadas / Canceladas */}
            <View className="w-[48%] rounded-xl border border-[#5F5F5F]/10 bg-white p-4 shadow-none">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-medium uppercase tracking-wide text-[#5F5F5F]/65">
                    Rechazadas/Canceladas
                  </Text>
                  <Text className="mt-1 text-2xl font-semibold text-[#5F5F5F]">
                    {reservationSummary.finalizadas}
                  </Text>
                </View>
                <XCircle size={24} color="#A67C52" />
              </View>
            </View>

            {/* Total estimado */}
            <View className="w-[48%] rounded-xl border border-[#6B8E23]/15 bg-[#F2E8CF] p-4 shadow-none">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-medium uppercase tracking-wide text-[#5F5F5F]/65">
                    Total estimado
                  </Text>
                  <Text className="mt-1 text-lg font-semibold text-[#6B8E23]">
                    {formatPrice(reservationSummary.totalEstimado)}
                  </Text>
                </View>
                <CircleDollarSign size={24} color="#6B8E23" />
              </View>
            </View>
          </View>

          {/* Filtros horizontales */}
          {reservas.length > 0 && (
            <View className="mb-6 rounded-xl border border-[#6B8E23]/10 bg-white p-2">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {FILTERS.map((filter) => {
                  const isActive = activeFilter === filter.value;
                  return (
                    <TouchableOpacity
                      key={filter.value}
                      onPress={() => setActiveFilter(filter.value)}
                      className={`mr-2 rounded-lg px-4 py-2 ${
                        isActive ? 'bg-[#6B8E23]' : 'bg-transparent'
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          isActive ? 'text-white' : 'text-[#5F5F5F]'
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
                const estadoPago =
                  reserva.estado_pago ||
                  reserva.estadoPago ||
                  reserva.pago_estado ||
                  reserva.payment_status;

                return (
                  <View
                    key={
                      hasValidReservationId
                        ? `reserva-${parsedReservaId}`
                        : `${reserva.id_propiedad || 'prop'}-${reserva.id_inquilino || 'inq'}-${reserva.fecha_inicio || 'fecha'}-${reserva.fecha_fin || 'fin'}-${index}`
                    }
                    className={`overflow-hidden rounded-3xl border border-[#6B8E23]/10 shadow-sm p-5 ${
                      styles.bg || styles.card
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
                          <Text className="text-xs font-medium text-[#5F5F5F]/70">Propiedad</Text>
                          <Text
                            numberOfLines={2}
                            className="mt-1 text-lg font-semibold text-[#5F5F5F]"
                          >
                            {tituloPropiedad}
                          </Text>
                        </View>
                      </View>

                      {/* Datos del Inquilino */}
                      <View className="space-y-3 rounded-xl bg-white/55 p-4">
                        <View className="mb-2">
                          <View className="mb-1 flex-row items-center gap-2">
                            <UserRound size={16} color="#A67C52" />
                            <Text className="text-xs font-medium text-[#5F5F5F]/70">
                              Inquilino
                            </Text>
                          </View>
                          <Text className="font-semibold text-[#5F5F5F]">{nombreInquilino}</Text>
                        </View>

                        <View className="mb-2">
                          <View className="mb-1 flex-row items-center gap-2">
                            <Mail size={16} color="#A67C52" />
                            <Text className="text-xs font-medium text-[#5F5F5F]/70">Correo</Text>
                          </View>
                          <Text className="text-sm text-[#5F5F5F]">{correoInquilino}</Text>
                        </View>

                        {telefonoInquilino && (
                          <View>
                            <View className="mb-1 flex-row items-center gap-2">
                              <Phone size={16} color="#A67C52" />
                              <Text className="text-xs font-medium text-[#5F5F5F]/70">
                                Teléfono
                              </Text>
                            </View>
                            <Text className="text-sm text-[#5F5F5F]">{telefonoInquilino}</Text>
                          </View>
                        )}
                      </View>

                      {/* Fechas, Total y Acciones */}
                      <View className="space-y-4">
                        <View className="flex-row justify-between mb-3">
                          <View className="flex-1 mr-2">
                            <View className="mb-1 flex-row items-center gap-1">
                              <Calendar size={16} color="#A67C52" />
                              <Text className="text-xs font-medium text-[#5F5F5F]/70">Fechas</Text>
                            </View>
                            <Text className="text-sm font-medium text-[#5F5F5F]">
                              {displayFechaInicio} - {displayFechaFin}
                            </Text>
                            <Text className="text-xs text-[#5F5F5F]/60">{nights} noche(s)</Text>
                          </View>

                          <View className="items-end">
                            <View className="mb-1 flex-row items-center gap-1">
                              <DollarSign size={12} color="#5F5F5F" />
                              <CircleDollarSign size={16} color="#A67C52" />
                              <Text className="text-xs font-medium text-[#5F5F5F]/70">Total</Text>
                            </View>
                            <Text className="text-lg font-bold text-[#6B8E23]">
                              {formatPrice(totalReserva)}
                            </Text>
                          </View>
                        </View>

                        {/* Badges de Estado y Pago */}
                        <View className="flex-row flex-wrap items-center gap-2 mb-3">
                          <View
                            className={`rounded-full border px-3 py-1 ${styles.badge}`}
                          >
                            <Text className="text-xs font-semibold">
                              {styles.label || reserva.estado}
                            </Text>
                          </View>

                          {estadoPago && (
                            <View className="rounded-full border border-[#A67C52]/20 bg-white px-3 py-1">
                              <Text className="text-xs font-semibold text-[#5F5F5F]">
                                Pago: {estadoPago}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Aviso Contrato */}
                        <View className="rounded-lg bg-white/60 px-3 py-2">
                          <Text className="text-xs leading-5 text-[#5F5F5F]/70">
                            El contrato se generará después del flujo de pago.
                          </Text>
                        </View>

                        {!hasValidReservationId && (
                          <View className="rounded-lg border border-red-200 bg-red-50 p-2">
                            <Text className="text-xs text-red-700">
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
                                  className={`flex-1 h-10 flex-row items-center justify-center rounded-xl bg-[#6B8E23] px-3 active:bg-[#5a7a1e] ${
                                    !hasValidReservationId || processingId === parsedReservaId
                                      ? 'opacity-60'
                                      : ''
                                  }`}
                                >
                                  <CheckCircle size={16} color="#ffffff" />
                                  <Text className="ml-2 font-medium text-white">Confirmar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => openActionModal(reserva, 'rechazada')}
                                  disabled={
                                    !hasValidReservationId || processingId === parsedReservaId
                                  }
                                  className={`flex-1 h-10 flex-row items-center justify-center rounded-xl bg-red-600 px-3 active:bg-red-700 ${
                                    !hasValidReservationId || processingId === parsedReservaId
                                      ? 'opacity-60'
                                      : ''
                                  }`}
                                >
                                  <XCircle size={16} color="#ffffff" />
                                  <Text className="ml-2 font-medium text-white">Rechazar</Text>
                                </TouchableOpacity>
                              </View>
                            )}

                            {(estado === 'confirmada' || estadoActual === 'CONFIRMADA') && (
                              <TouchableOpacity
                                onPress={() => openActionModal(reserva, 'cancelada')}
                                disabled={
                                  !hasValidReservationId || processingId === parsedReservaId
                                }
                                className={`h-10 flex-row items-center justify-center rounded-xl bg-[#A67C52] px-3 active:bg-[#8f6844] ${
                                  !hasValidReservationId || processingId === parsedReservaId
                                    ? 'opacity-60'
                                    : ''
                                }`}
                              >
                                <AlertCircle size={16} color="#ffffff" />
                                <Text className="ml-2 font-medium text-white">
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

      {/* Modal de Confirmar / Rechazar Acción */}
      <Modal
        visible={Boolean(pendingAction && !isCancellingAction)}
        transparent
        animationType="fade"
        onRequestClose={closeActionModal}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-4 py-6">
          <View className="w-full max-w-md rounded-xl border border-[#A67C52]/20 bg-[#F2E8CF] p-6 shadow-xl">
            <View className="mb-5">
              <Text className="text-xl font-semibold text-[#5F5F5F]">{modalTitle}</Text>
              <Text className="mt-2 text-sm leading-6 text-[#5F5F5F]/80">{modalMessage}</Text>
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
                <Text className="text-sm font-medium text-[#5F5F5F] mb-1">
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
                  placeholderTextColor="#5F5F5F70"
                  className="mt-2 h-28 w-full rounded-xl border border-[#A67C52]/25 bg-white p-3 text-sm text-[#5F5F5F]"
                />
              </View>
            )}

            <View className="flex-row justify-end gap-3">
              <TouchableOpacity
                onPress={closeActionModal}
                disabled={Boolean(processingId)}
                className="h-10 items-center justify-center rounded-xl border-2 border-[#6B8E23] bg-white px-4 active:bg-[#FAFAFA]"
              >
                <Text className="font-medium text-[#6B8E23]">
                  {actionFeedback.type === 'success' ? 'Cerrar' : 'Cancelar'}
                </Text>
              </TouchableOpacity>

              {actionFeedback.type !== 'success' && (
                <TouchableOpacity
                  onPress={confirmPendingAction}
                  disabled={Boolean(processingId) || (isRejectingAction && !rejectReason.trim())}
                  className={`h-10 flex-row items-center justify-center rounded-xl px-4 ${
                    isConfirmingAction
                      ? 'bg-[#6B8E23] active:bg-[#5a7a1e]'
                      : isRejectingAction
                        ? 'bg-red-600 active:bg-red-700'
                        : 'bg-[#A67C52] active:bg-[#8f6844]'
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
                  <Text className="ml-2 font-medium text-white">{modalConfirmLabel}</Text>
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