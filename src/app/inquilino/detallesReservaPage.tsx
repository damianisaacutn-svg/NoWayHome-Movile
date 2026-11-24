import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  MapPin,
  MoreVertical,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE_URL, API_URL } from "@/config/api";
import { inquilinoController } from "@/controllers/inquilinoController";
import {
  propiedadController,
  type PropiedadImagenItem,
} from "@/controllers/propiedadController";
import { authService } from "@/services/authService";
import {
  extraerTituloPropiedadDeReserva,
  notificarPagoConfirmadoInquilino,
  notificarReservaCanceladaPorInquilino,
} from "@/services/notificationSyncService";
import { tenantBookingService } from "@/services/tenantBookingService";
import { formatDateLong, formatDateShort, parseDateOnly } from "@/utils/dateUtils";
import {
  getStoredSessionUser,
  getTenantId,
  resolveUserRole,
} from "@/utils/sessionRole";
import { AlertMessage } from "../../components/AlertMessage";
import { BottomTabBar } from "../../components/BottomTabBar";
import { CancelBookingModal } from "../../components/CancelBookingModal";
import { HeaderInquilino } from "../../components/headerInquilino";
import { LoadingState } from "../../components/LoadingState";
import { PLACEHOLDER_PROPERTY_IMAGE } from "./constants";

function buildEndpointUrl(path: string): string {
  const cleanPath = String(path || "").replace(/^\/api(?=\/|$)/, "");
  const normalizedPath = cleanPath.startsWith("/")
    ? cleanPath
    : `/${cleanPath}`;
  return `${API_URL}${normalizedPath}`;
}

async function requestJson(path: string, options: RequestInit = {}) {
  const res = await fetch(buildEndpointUrl(path), {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.message || data.error || "No se pudo cargar la reserva.",
    );
  }
  return data;
}

function resolveImageUri(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (/^(https?:\/\/|data:image\/)/i.test(trimmed)) return trimmed;
    const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${API_BASE_URL}${normalizedPath}`;
  }
  if (typeof raw === "object") {
    const item = raw as PropiedadImagenItem;
    return resolveImageUri(item.url || item.imagen_url || item.imagen);
  }
  return null;
}

function getActiveTenantId(): string | number | null {
  const session = authService.getSession();
  if (!session?.isAuthenticated) return null;
  return getTenantId(getStoredSessionUser(), session?.role);
}

function getPaidReceiptStorageKey(reservaId: string | number): string {
  return `nowayhome_paid_reserva_${String(reservaId).trim()}`;
}

function getStoredPaidReceipt(
  reservaId?: string | number | null,
): Record<string, any> | null {
  if (reservaId === null || reservaId === undefined || reservaId === "") {
    return null;
  }
  const raw = authService.getStorageItem(getPaidReceiptStorageKey(reservaId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function saveStoredPaidReceipt(
  reservaId: string | number,
  receipt: Record<string, any>,
): void {
  authService.setStorageItem(
    getPaidReceiptStorageKey(reservaId),
    JSON.stringify(receipt),
  );
}

const calculateNights = (
  startDate?: string | null,
  endDate?: string | null,
): number => {
  if (!startDate || !endDate) return 0;
  const start = parseDateOnly(startDate) || new Date(startDate);
  const end = parseDateOnly(endDate) || new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

// Modal de cancelación reutilizado desde ../../components/CancelBookingModal

interface BookingContractProps {
  reserva: Record<string, any>;
  propertyTitle: string;
  propertyLocation: string;
  totalFinal: number;
  noches: number;
  formatPrice: (val: number) => string;
}

function BookingContract({
  reserva,
  propertyTitle,
  propertyLocation,
  totalFinal,
  noches,
  formatPrice,
}: BookingContractProps) {
  const inquilinoNombre =
    reserva?.inquilino?.nombre ||
    reserva?.nombre_inquilino ||
    (authService.getSession()?.user as any)?.nombre ||
    "Huésped Verificado";

  const arrendatarioNombre =
    reserva?.arrendatario?.nombre ||
    reserva?.propiedad?.arrendatario?.nombre ||
    reserva?.nombre_arrendatario ||
    "Anfitrión NoWayHome";

  const pagosList = Array.isArray(reserva?.pagos) ? reserva.pagos : [];
  const transaccionPaypal =
    pagosList.find((p: any) => p?.id_transaccion_paypal || p?.orderID || p?.id)
      ?.id_transaccion_paypal ||
    pagosList[0]?.orderID ||
    reserva?.id_transaccion_paypal ||
    null;

  return (
    <View className="rounded-2xl border border-[#DCDCDC] bg-white p-6 shadow-sm">
      <View className="flex-row items-center gap-3 border-b border-[#DCDCDC] pb-4 mb-4">
        <View className="h-11 w-11 rounded-full bg-[#B8860B]/15 items-center justify-center">
          <FileText size={22} color="#B8860B" />
        </View>
        <View className="flex-1">
          <Text className="font-poppins text-lg font-semibold text-[#1C1C1C]">
            Constancia de Reserva
          </Text>
          <Text className="font-inter text-xs text-[#595959]">
            Folio #{reserva?.id_reserva || reserva?.id || "N/A"}
            {transaccionPaypal ? ` • PayPal: ${transaccionPaypal}` : ""}
          </Text>
        </View>
      </View>

      <View className="flex-col gap-3 mb-5">
        <View className="rounded-xl bg-[#FAFAFA] p-3.5 border border-[#DCDCDC]">
          <Text className="font-inter-semibold text-xs text-[#B87333] uppercase">
            Alojamiento
          </Text>
          <Text className="font-poppins text-base font-semibold text-[#1C1C1C] mt-0.5">
            {propertyTitle}
          </Text>
          <Text className="font-inter text-xs text-[#595959] mt-0.5">
            {propertyLocation}
          </Text>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 rounded-xl bg-[#FAFAFA] p-3.5 border border-[#DCDCDC]">
            <Text className="font-inter-semibold text-xs text-[#B87333]">
              Huésped
            </Text>
            <Text className="font-inter-medium text-sm text-[#1C1C1C] mt-0.5">
              {inquilinoNombre}
            </Text>
          </View>
          <View className="flex-1 rounded-xl bg-[#FAFAFA] p-3.5 border border-[#DCDCDC]">
            <Text className="font-inter-semibold text-xs text-[#B87333]">
              Anfitrión
            </Text>
            <Text className="font-inter-medium text-sm text-[#1C1C1C] mt-0.5">
              {arrendatarioNombre}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 rounded-xl bg-[#FAFAFA] p-3.5 border border-[#DCDCDC]">
            <Text className="font-inter-semibold text-xs text-[#B87333]">
              Entrada
            </Text>
            <Text className="font-inter-semibold text-sm text-[#1C1C1C] mt-0.5">
              {formatDateLong(reserva?.fecha_inicio || reserva?.fecha_entrada)}
            </Text>
          </View>
          <View className="flex-1 rounded-xl bg-[#FAFAFA] p-3.5 border border-[#DCDCDC]">
            <Text className="font-inter-semibold text-xs text-[#B87333]">
              Salida
            </Text>
            <Text className="font-inter-semibold text-sm text-[#1C1C1C] mt-0.5">
              {formatDateLong(reserva?.fecha_fin || reserva?.fecha_salida)}
            </Text>
          </View>
        </View>

        <View className="rounded-xl bg-[#F5F2EC] border border-[#DCDCDC] p-4 flex-row items-center justify-between">
          <View>
            <Text className="font-inter text-xs text-[#595959]">
              Total ({noches} {noches === 1 ? "noche" : "noches"})
            </Text>
            <Text className="font-poppins text-lg font-semibold text-[#B8860B]">
              {formatPrice(totalFinal)}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5 bg-white border border-[#DCDCDC] px-3 py-1.5 rounded-full">
            <ShieldCheck size={16} color="#B8860B" />
            <Text className="font-inter-semibold text-xs text-[#B8860B]">
              Verificada
            </Text>
          </View>
        </View>
      </View>

      <Text className="font-inter text-xs text-[#595959] text-center leading-relaxed">
        Presenta esta constancia digital al momento de tu llegada. NoWayHome
        protege tu estancia de principio a fin.
      </Text>
    </View>
  );
}

export function DetalleReservaPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    idReserva?: string | string[];
    id?: string | string[];
    pagoExitoso?: string | string[];
  }>();

  const rawParamId = params.idReserva ?? params.id;
  const idReserva = Array.isArray(rawParamId) ? rawParamId[0] : rawParamId;
  const rawPagoExitoso = Array.isArray(params.pagoExitoso)
    ? params.pagoExitoso[0]
    : params.pagoExitoso;

  const [reserva, setReserva] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [view, setView] = useState<"details" | "contract">(() =>
    rawPagoExitoso === "1" ? "contract" : "details",
  );
  const [imagenActual, setImagenActual] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPayPalModal, setShowPayPalModal] = useState(false);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(
    () => rawPagoExitoso === "1",
  );
  const [pendingOrderId, setPendingOrderId] = useState<string>("");
  const [pendingApproveLink, setPendingApproveLink] = useState<string>("");
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentModalError, setPaymentModalError] = useState<string>("");
  const isCapturingRef = useRef(false);

  useEffect(() => {
    const subscription = Linking.addEventListener("url", (event) => {
      if (event.url && event.url.includes("pagoExitoso=1")) {
        setShowPayPalModal(false);
        setView("contract");
        setShowPaymentSuccessModal(true);
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchReserva = async () => {
      const session = authService.getSession();
      const storedUser = getStoredSessionUser();
      if (!session?.isAuthenticated || !storedUser) {
        router.replace("/" as any);
        return;
      }

      const role = resolveUserRole(storedUser, session?.role);
      const tenantId = getTenantId(storedUser, session?.role);
      if (role === "arrendatario" && !tenantId) {
        router.replace("/arrendatario/ReservasArrendatario" as any);
        return;
      }

      if (!idReserva) {
        if (isMounted) {
          setError("ID de reserva no especificado.");
          setLoading(false);
        }
        return;
      }

      try {
        setError("");
        setLoading(true);
        const normalizedReservaId = decodeURIComponent(String(idReserva));

        let reservaCompleta: Record<string, any> | null = null;

        try {
          const data = await requestJson(
            `/inquilino/reservas/${encodeURIComponent(
              normalizedReservaId,
            )}?populate=propiedad,arrendatario,inquilino,pagos`,
          );
          reservaCompleta =
            data?.reservation || data?.reserva || data?.data || data || null;
        } catch {
          // Fallback: buscar la reserva dentro del perfil del inquilino
          const storedUserId = getActiveTenantId();
          if (storedUserId) {
            const perfilRes =
              await inquilinoController.cargarPerfilCompleto(storedUserId);
            if (perfilRes.success && Array.isArray(perfilRes.data?.reservas)) {
              reservaCompleta =
                perfilRes.data.reservas.find(
                  (r: any) =>
                    String(r.id_reserva ?? r.id) ===
                    String(normalizedReservaId),
                ) || null;
            }
          }
        }

        // Si la consulta individual no trajo pagos ni estado_pago, enriquecer desde el perfil o recibo local
        if (
          reservaCompleta &&
          !reservaCompleta.estado_pago &&
          (!Array.isArray(reservaCompleta.pagos) ||
            reservaCompleta.pagos.length === 0)
        ) {
          const storedUserId = getActiveTenantId();
          if (storedUserId) {
            try {
              const perfilRes =
                await inquilinoController.cargarPerfilCompleto(storedUserId);
              if (
                perfilRes.success &&
                Array.isArray(perfilRes.data?.reservas)
              ) {
                const matchInProfile = perfilRes.data.reservas.find(
                  (r: any) =>
                    String(r.id_reserva ?? r.id) ===
                    String(normalizedReservaId),
                );
                if (matchInProfile) {
                  reservaCompleta = {
                    ...matchInProfile,
                    ...reservaCompleta,
                    estado_pago:
                      reservaCompleta.estado_pago ||
                      matchInProfile.estado_pago,
                    pagos:
                      Array.isArray(reservaCompleta.pagos) &&
                      reservaCompleta.pagos.length > 0
                        ? reservaCompleta.pagos
                        : matchInProfile.pagos,
                  };
                }
              }
            } catch {
              // Ignorar si falla enriquecimiento secundario
            }
          }
        }

        if (!reservaCompleta) {
          throw new Error(
            "No se encontraron los datos de la reserva solicitada.",
          );
        }

        const localPaidReceipt = getStoredPaidReceipt(
          reservaCompleta.id_reserva ?? reservaCompleta.id ?? normalizedReservaId,
        );
        if (localPaidReceipt) {
          const existingPagos = Array.isArray(reservaCompleta.pagos)
            ? reservaCompleta.pagos
            : [];
          reservaCompleta = {
            ...reservaCompleta,
            estado_pago: reservaCompleta.estado_pago || "COMPLETADO",
            id_transaccion_paypal:
              reservaCompleta.id_transaccion_paypal ||
              localPaidReceipt.id_transaccion_paypal ||
              localPaidReceipt.orderID,
            pagos:
              existingPagos.length > 0 ? existingPagos : [localPaidReceipt],
          };
        }

        // Si falta poblar la propiedad o sus imágenes, consultamos los detalles de la propiedad
        const propId =
          reservaCompleta.id_propiedad ??
          reservaCompleta.propiedad?.id_propiedad ??
          reservaCompleta.propiedad?.id;

        if (
          propId &&
          (!reservaCompleta.propiedad ||
            (!reservaCompleta.propiedad.imagenes &&
              !reservaCompleta.propiedad.imagen_principal))
        ) {
          const propRes =
            await propiedadController.cargarDetallesPropiedad(propId);
          if (propRes.success && propRes.data) {
            reservaCompleta = {
              ...reservaCompleta,
              propiedad: {
                ...(reservaCompleta.propiedad || {}),
                ...propRes.data,
              },
            };
          }
        }

        if (isMounted) {
          setReserva(reservaCompleta);
          setImagenActual(0);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar la reserva.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchReserva();

    return () => {
      isMounted = false;
    };
  }, [idReserva, router]);

  const fechaEntradaVal = reserva?.fecha_inicio || reserva?.fecha_entrada;
  const fechaSalidaVal = reserva?.fecha_fin || reserva?.fecha_salida;
  const noches = calculateNights(fechaEntradaVal, fechaSalidaVal);

  const rawPagoNumeric =
    typeof reserva?.pago === "object" && reserva?.pago !== null
      ? Number(reserva.pago.monto ?? reserva.pago.total ?? 0)
      : Number(reserva?.pago ?? 0);
  const rawTotal =
    (Number.isFinite(rawPagoNumeric) && rawPagoNumeric > 0
      ? rawPagoNumeric
      : 0) ||
    Number(reserva?.total_pagado ?? 0) ||
    Number(reserva?.precio_total ?? 0) ||
    Number(reserva?.total ?? 0) ||
    0;
  const rawPrecioPorNoche = Number(
    reserva?.propiedad?.precio_noche ??
      reserva?.propiedad?.precio_por_noche ??
      reserva?.propiedad?.precio ??
      reserva?.precio_noche ??
      reserva?.precio ??
      0,
  );

  // Si no viene el precio por noche pero sí el total pagado (que incluye 10% comisión), lo deducimos
  const precioPorNoche =
    rawPrecioPorNoche > 0
      ? rawPrecioPorNoche
      : rawTotal > 0 && noches > 0
        ? Math.round((rawTotal / 1.1 / noches) * 100) / 100
        : 0;

  const precioBaseTotal = Number(
    reserva?.precio_base ?? precioPorNoche * noches,
  );

  const comisionExistente = Number(
    reserva?.comision_y_otros ??
      reserva?.tarifa_servicio ??
      reserva?.tarifa ??
      0,
  );
  const comisionYOtros =
    comisionExistente > 0 ? comisionExistente : precioBaseTotal * 0.1;

  const totalCalculado = precioBaseTotal + comisionYOtros;
  const totalFinal = totalCalculado > 0 ? totalCalculado : rawTotal;

  const verifyAndCapturePayment = useCallback(
    async (
      orderID: string,
      options: { silentIfUnapproved?: boolean } = {},
    ): Promise<boolean> => {
      const cleanOrderId = String(orderID || "").trim();
      if (!reserva || !cleanOrderId) return false;
      if (isCapturingRef.current) return false;

      const targetId = reserva.id_reserva || reserva.id || idReserva;
      const numericId = Number(targetId);
      const cleanIdReserva =
        Number.isFinite(numericId) && numericId > 0 ? numericId : targetId;

      isCapturingRef.current = true;
      setIsVerifyingPayment(true);
      if (!options.silentIfUnapproved) {
        setPaymentModalError("");
      }

      try {
        const res = await fetch(buildEndpointUrl("/payments/capturar-orden"), {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderID: cleanOrderId,
            orderId: cleanOrderId,
            id_orden: cleanOrderId,
            token: cleanOrderId,
            idReserva: cleanIdReserva,
            id_reserva: cleanIdReserva,
            monto: Number((totalFinal || 0).toFixed(2)),
            total: Number((totalFinal || 0).toFixed(2)),
          }),
        });

        const result = await res.json().catch(() => ({}));
        const rawErrorText = String(
          result?.message ||
            result?.error ||
            result?.details ||
            "",
        );

        const isAlreadyCaptured =
          /ORDER_ALREADY_CAPTURED|already been captured|ya fue capturada|ya est[aá] pagada/i.test(
            rawErrorText,
          );

        const captureStatus = String(
          result?.status ||
            result?.data?.status ||
            result?.capture?.status ||
            result?.order?.status ||
            "",
        ).toUpperCase();

        const isCaptureSuccessful =
          isAlreadyCaptured ||
          (res.ok &&
            (result?.success === true ||
              result?.ok === true ||
              captureStatus === "COMPLETED" ||
              captureStatus === "APPROVED" ||
              Boolean(
                result?.pago ||
                  result?.payment ||
                  result?.reserva ||
                  result?.reservation,
              ) ||
              (result?.success !== false &&
                result?.ok !== false &&
                !result?.error)));

        if (isCaptureSuccessful) {
          const nuevoPago = {
            id_transaccion_paypal: cleanOrderId,
            orderID: cleanOrderId,
            monto: totalFinal,
            estado_pago: "COMPLETADO",
            fecha_pago: new Date().toISOString(),
          };

          if (cleanIdReserva !== undefined && cleanIdReserva !== null) {
            saveStoredPaidReceipt(cleanIdReserva, nuevoPago);
          }

          setReserva((prev) => {
            if (!prev) return prev;
            const prevPagos = Array.isArray(prev.pagos) ? prev.pagos : [];
            const alreadyInList = prevPagos.some(
              (p: any) =>
                String(p?.id_transaccion_paypal || p?.orderID) === cleanOrderId,
            );
            return {
              ...prev,
              ...(result?.reserva || result?.reservation || {}),
              estado: "CONFIRMADA",
              estado_reserva: "CONFIRMADA",
              estado_pago: "COMPLETADO",
              id_transaccion_paypal: cleanOrderId,
              pagos: alreadyInList ? prevPagos : [...prevPagos, nuevoPago],
            };
          });

          setShowPayPalModal(false);
          setPendingOrderId("");
          setPendingApproveLink("");
          setPaymentModalError("");
          setView("contract");
          setShowPaymentSuccessModal(true);

          notificarPagoConfirmadoInquilino({
            idReserva: cleanIdReserva,
            idInquilino: reserva?.id_inquilino ?? getActiveTenantId(),
            tituloPropiedad: extraerTituloPropiedadDeReserva(reserva),
          });

          // Cerrar automáticamente la ventana de PayPal:
          // - En iOS: dismissBrowser() cierra SFSafariViewController.
          // - En Android: como abrimos Chrome Custom Tabs con `createTask: false`
          //   dentro del mismo task de MainActivity (singleTask), al disparar un
          //   deep link hacia nuestra propia pantalla Android aplica CLEAR_TOP y
          //   cierra automáticamente la pestaña de PayPal trayendo la app al frente.
          try {
            if (Platform.OS === "ios") {
              WebBrowser.dismissBrowser();
            } else if (Platform.OS === "android") {
              const returnDeepLink = Linking.createURL(
                "/inquilino/detallesReservaPage",
                {
                  queryParams: {
                    idReserva: String(cleanIdReserva),
                    pagoExitoso: "1",
                  },
                },
              );
              void Linking.openURL(returnDeepLink).catch(() => null);
            }
          } catch {
            // Ignorar si el navegador ya fue cerrado
          }

          return true;
        }

        if (!options.silentIfUnapproved) {
          const isUnapprovedOrder =
            /ORDER_NOT_APPROVED|not approved|UNPROCESSABLE_ENTITY|no se pudo capturar|422/i.test(
              rawErrorText,
            ) || !res.ok;

          setPaymentModalError(
            isUnapprovedOrder
              ? "PayPal aún no registra la aprobación del pago. Completa el inicio de sesión y presiona 'Continuar / Pagar ahora' en la ventana de PayPal, luego vuelve a confirmar aquí."
              : rawErrorText ||
                  "El pago aún no se ha completado en PayPal. Intenta verificar nuevamente.",
          );
        }
        return false;
      } catch (err: unknown) {
        if (!options.silentIfUnapproved) {
          setPaymentModalError(
            err instanceof Error
              ? err.message
              : "Error de conexión al verificar el pago con el servidor.",
          );
        }
        return false;
      } finally {
        isCapturingRef.current = false;
        setIsVerifyingPayment(false);
      }
    },
    [idReserva, reserva, totalFinal],
  );

  // Verificación continua en segundo plano (incluyendo cuando Chrome Custom Tabs está en primer plano en Android)
  useEffect(() => {
    if (!showPayPalModal || !pendingOrderId) {
      return;
    }

    let isCancelled = false;

    // En Android, cuando Chrome Custom Tabs está abierta encima de MainActivity,
    // React Native pausa setTimeout/setInterval (JavaTimerManager), pero NO pausa
    // las promesas de red (OkHttp / fetch). Por ello encadenamos peticiones HTTP
    // continuas para detectar la aprobación en PayPal en tiempo real y cerrar el navegador.
    const runContinuousCaptureLoop = async () => {
      let attempts = 0;
      while (!isCancelled && attempts < 600) {
        attempts += 1;
        const captured = await verifyAndCapturePayment(pendingOrderId, {
          silentIfUnapproved: true,
        });
        if (captured || isCancelled) {
          return;
        }

        if (Platform.OS === "android" && AppState.currentState !== "active") {
          await fetch(
            buildEndpointUrl(
              `/inquilino/reservas/${encodeURIComponent(
                String(idReserva || ""),
              )}`,
            ),
          ).catch(() => null);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    };

    void runContinuousCaptureLoop();

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && !isCancelled) {
        void verifyAndCapturePayment(pendingOrderId, {
          silentIfUnapproved: true,
        });
      }
    });

    const handleWebFocus = () => {
      if (!isCancelled) {
        void verifyAndCapturePayment(pendingOrderId, {
          silentIfUnapproved: true,
        });
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.addEventListener("focus", handleWebFocus);
    }

    return () => {
      isCancelled = true;
      appStateSub.remove();
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.removeEventListener("focus", handleWebFocus);
      }
    };
  }, [idReserva, pendingOrderId, showPayPalModal, verifyAndCapturePayment]);

  const handleOpenPayPal = async () => {
    if (!reserva) return;
    setIsProcessingPayment(true);
    setError("");
    setPaymentModalError("");

    try {
      const targetId = reserva.id_reserva || reserva.id || idReserva;
      const numericId = Number(targetId);
      const cleanIdReserva =
        Number.isFinite(numericId) && numericId > 0 ? numericId : targetId;

      const order = await requestJson("/payments/crear-orden", {
        method: "POST",
        body: JSON.stringify({
          idReserva: cleanIdReserva,
          id_reserva: cleanIdReserva,
          monto: Number((totalFinal || 0).toFixed(2)),
          total: Number((totalFinal || 0).toFixed(2)),
        }),
      });

      const resolvedOrderId = String(
        order?.id ||
          order?.orderID ||
          order?.orderId ||
          order?.data?.id ||
          order?.order?.id ||
          "",
      ).trim();

      const links =
        order?.links || order?.data?.links || order?.order?.links || [];
      const approveLink =
        (Array.isArray(links)
          ? links.find(
              (l: any) => l?.rel === "approve" || l?.rel === "payer-action",
            )?.href
          : null) ||
        order?.approveUrl ||
        order?.approvalUrl ||
        (resolvedOrderId
          ? `https://www.sandbox.paypal.com/checkoutnow?token=${encodeURIComponent(
              resolvedOrderId,
            )}`
          : null);

      if (!approveLink || !resolvedOrderId) {
        throw new Error(
          order?.error ||
            order?.message ||
            "No se pudo obtener el enlace de pago de PayPal.",
        );
      }

      setPendingOrderId(resolvedOrderId);
      setPendingApproveLink(approveLink);
      setShowPayPalModal(true);

      // En Android usamos `createTask: false` para que Chrome Custom Tabs se abra
      // en el mismo task que MainActivity (singleTask) y pueda cerrarse automáticamente
      // en cuanto el pago sea capturado.
      const browserResult = await WebBrowser.openBrowserAsync(approveLink, {
        createTask: false,
        showInRecents: false,
      });

      if (
        browserResult?.type === "cancel" ||
        browserResult?.type === "dismiss"
      ) {
        await verifyAndCapturePayment(resolvedOrderId, {
          silentIfUnapproved: true,
        });
      }
    } catch (err: unknown) {
      Alert.alert(
        "Error de pago",
        err instanceof Error
          ? err.message
          : "No se pudo iniciar el proceso de pago con PayPal.",
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleReopenPayPalBrowser = async () => {
    if (!pendingApproveLink) return;
    setPaymentModalError("");
    try {
      const browserResult = await WebBrowser.openBrowserAsync(
        pendingApproveLink,
        {
          createTask: false,
          showInRecents: false,
        },
      );
      if (
        pendingOrderId &&
        (browserResult?.type === "cancel" || browserResult?.type === "dismiss")
      ) {
        await verifyAndCapturePayment(pendingOrderId, {
          silentIfUnapproved: true,
        });
      }
    } catch {
      setPaymentModalError("No se pudo abrir la ventana de PayPal.");
    }
  };

  const handleCancelarReserva = async (motivoFinal: string) => {
    if (!reserva) return;
    const targetReservaId = reserva.id_reserva ?? reserva.id ?? idReserva;
    const targetInquilinoId =
      reserva.id_inquilino ??
      reserva.inquilino?.id_inquilino ??
      getActiveTenantId();

    if (!targetReservaId || !targetInquilinoId) {
      setCancelError("No se pudo identificar la reserva o el usuario.");
      return;
    }

    setIsCanceling(true);
    setCancelError("");

    try {
      const reservaCancelada = await tenantBookingService.cancelarReserva({
        idReserva: targetReservaId,
        idInquilino: targetInquilinoId,
        motivoCancelacion: motivoFinal,
      });

      setReserva((prev) => ({
        ...(prev || {}),
        ...(reservaCancelada || {}),
        estado: reservaCancelada?.estado || "CANCELADA",
        estado_reserva: reservaCancelada?.estado || "CANCELADA",
      }));
      setShowCancelConfirm(false);
      notificarReservaCanceladaPorInquilino({
        idReserva: targetReservaId,
        idInquilino: targetInquilinoId,
        tituloPropiedad: extraerTituloPropiedadDeReserva(reserva),
        isPaid,
      });
      Alert.alert(
        "Reserva cancelada",
        isPaid
          ? "La reserva fue cancelada. Si existía un pago asociado, el reembolso se gestionará próximamente."
          : "Tu reserva ha sido cancelada correctamente.",
      );
    } catch (err: unknown) {
      setCancelError(
        err instanceof Error
          ? err.message
          : "No se pudo cancelar la reserva. Intenta nuevamente.",
      );
    } finally {
      setIsCanceling(false);
    }
  };

  const handleDeleteReservation = async () => {
    if (!reserva) return;
    const targetReservaId = reserva.id_reserva ?? reserva.id ?? idReserva;
    const targetInquilinoId =
      reserva.id_inquilino ??
      reserva.inquilino?.id_inquilino ??
      getActiveTenantId();

    if (!targetReservaId || !targetInquilinoId) return;

    setIsDeleting(true);
    setDeleteError("");

    try {
      await requestJson(`/inquilino/reservas/${targetReservaId}/hide`, {
        method: "PATCH",
        body: JSON.stringify({
          id_inquilino: targetInquilinoId,
        }),
      });

      setShowDeleteConfirm(false);
      router.replace("/inquilino/profileInquilino" as any);
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar la reserva del historial.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const formatPrice = (price: number | string | null | undefined) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(Number(price) || 0);

  const formatDate = (value?: string | null) => formatDateShort(value);

  const rawEstado = String(
    reserva?.estado || reserva?.estado_reserva || "PENDIENTE",
  )
    .trim()
    .toUpperCase();

  const estado =
    rawEstado === "PENDING"
      ? "PENDIENTE"
      : rawEstado === "CONFIRMED"
        ? "CONFIRMADA"
        : rawEstado === "CANCELLED" || rawEstado === "CANCELED"
          ? "CANCELADA"
          : rawEstado === "REJECTED"
            ? "RECHAZADA"
            : rawEstado;

  const pagos = Array.isArray(reserva?.pagos)
    ? reserva.pagos
    : reserva?.pagos && typeof reserva.pagos === "object"
      ? [reserva.pagos]
      : [];
  const estadosPagoConfirmado = [
    "COMPLETADO",
    "COMPLETED",
    "CONFIRMADO",
    "CONFIRMED",
    "PAGADO",
    "PAID",
    "APROBADO",
    "APPROVED",
  ];
  const estadoPagoReserva = String(
    reserva?.estado_pago ||
      reserva?.estadoPago ||
      reserva?.pago_estado ||
      reserva?.payment_status ||
      reserva?.pago?.estado_pago ||
      reserva?.pago?.estado ||
      "",
  ).toUpperCase();
  const storedPaidReceipt = getStoredPaidReceipt(
    reserva?.id_reserva ?? reserva?.id ?? idReserva,
  );
  const isPaid =
    Boolean(storedPaidReceipt) ||
    Boolean(reserva?.id_transaccion_paypal) ||
    reserva?.pagado === true ||
    estadosPagoConfirmado.includes(estadoPagoReserva) ||
    pagos.some(
      (pago: any) =>
        Boolean(pago?.id_transaccion_paypal) ||
        estadosPagoConfirmado.includes(
          String(
            pago?.estado_pago || pago?.estado || pago?.status || "",
          ).toUpperCase(),
        ),
    );

  const canDeleteFromHistory = ["CANCELADA", "RECHAZADA"].includes(estado);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "CONFIRMADA":
        return {
          label: "Confirmada",
          bg: "bg-[#B8860B]/15",
          text: "text-[#B8860B]",
          border: "border-[#B8860B]/30",
        };
      case "PENDIENTE":
        return {
          label: "Pendiente de Aprobación",
          bg: "bg-[#F5F2EC]",
          text: "text-[#B87333]",
          border: "border-[#B87333]/30",
        };
      case "CANCELADA":
        return {
          label: "Cancelada",
          bg: "bg-orange-500/10",
          text: "text-orange-700",
          border: "border-orange-500/20",
        };
      case "RECHAZADA":
        return {
          label: "Rechazada",
          bg: "bg-red-500/10",
          text: "text-red-700",
          border: "border-red-500/20",
        };
      default:
        return {
          label: status || "Pendiente de Aprobación",
          bg: "bg-[#F5F2EC]",
          text: "text-[#B87333]",
          border: "border-[#B87333]/30",
        };
    }
  };

  const statusInfo = getStatusInfo(estado);
  const canCancel = ["PENDIENTE", "CONFIRMADA"].includes(estado);

  const getText = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";
  const getTitleFromDescription = (description: unknown) =>
    getText(description)
      .split("\n")
      .map((part) => part.trim())
      .find(Boolean) || "";

  const propertyTitle =
    reserva?.propiedad?.titulo ||
    reserva?.propiedad?.nombre ||
    getTitleFromDescription(reserva?.propiedad?.descripcion) ||
    reserva?.titulo_propiedad ||
    reserva?.titulo ||
    "Alojamiento No Way Home";

  const propertyLocation =
    reserva?.propiedad?.direccion ||
    reserva?.propiedad?.ubicacion ||
    reserva?.propiedad?.ciudad ||
    reserva?.ubicacion_propiedad ||
    reserva?.ubicacion ||
    "Ubicación no disponible";

  const galleryUrls = useMemo<string[]>(() => {
    const list: string[] = [];
    const rawList = Array.isArray(reserva?.propiedad?.imagenes)
      ? reserva.propiedad.imagenes
      : Array.isArray(reserva?.imagenes)
        ? reserva.imagenes
        : [];

    for (const item of rawList) {
      const resolved = resolveImageUri(item);
      if (resolved && !list.includes(resolved)) {
        list.push(resolved);
      }
    }

    const mainImg = resolveImageUri(
      reserva?.propiedad?.imagen ||
        reserva?.propiedad?.imagen_principal ||
        reserva?.imagen_principal ||
        reserva?.imagen_portada,
    );
    if (mainImg && !list.includes(mainImg)) {
      list.unshift(mainImg);
    }

    return list.length > 0 ? list : [PLACEHOLDER_PROPERTY_IMAGE];
  }, [reserva]);

  const handlePrevImage = () => {
    setImagenActual((prev) =>
      prev === 0 ? galleryUrls.length - 1 : prev - 1,
    );
  };

  const handleNextImage = () => {
    setImagenActual((prev) =>
      prev === galleryUrls.length - 1 ? 0 : prev + 1,
    );
  };

  const detailItems = [
    {
      icon: CalendarDays,
      label: "Entrada",
      value: formatDate(fechaEntradaVal),
    },
    {
      icon: CalendarDays,
      label: "Salida",
      value: formatDate(fechaSalidaVal),
    },
    {
      icon: Users,
      label: "Huéspedes",
      value: String(reserva?.huespedes ?? reserva?.huéspedes ?? 1),
    },
    {
      icon: ReceiptText,
      label: "Reserva ID",
      value: String(reserva?.id_reserva || reserva?.id || idReserva || "—"),
    },
  ];

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 bg-[#FAFAFA]"
        edges={["top", "left", "right"]}
      >
        <StatusBar style="dark" />
        <HeaderInquilino />
        <View className="flex-1 bg-[#FAFAFA] items-center justify-center">
          <LoadingState message="Cargando detalles de la reserva..." />
        </View>
        <BottomTabBar />
      </SafeAreaView>
    );
  }

  if (!reserva) {
    return (
      <SafeAreaView
        className="flex-1 bg-[#FAFAFA]"
        edges={["top", "left", "right"]}
      >
        <StatusBar style="dark" />
        <HeaderInquilino />
        <View className="flex-1 bg-[#FAFAFA] px-4 py-8 items-center justify-center">
          <AlertMessage
            type="error"
            title="No pudimos cargar la reserva"
            message={error || "La reserva solicitada no está disponible."}
            className="mb-6 w-full"
          />
          <TouchableOpacity
            onPress={() => router.replace("/inquilino/profileInquilino" as any)}
            className="min-h-[48px] justify-center bg-[#B8860B] rounded-xl px-6 py-3.5"
          >
            <Text className="font-inter-medium text-white">
              Volver a mi perfil
            </Text>
          </TouchableOpacity>
        </View>
        <BottomTabBar />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <HeaderInquilino />

      <ScrollView
        className="flex-1 bg-[#FAFAFA] px-4 py-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera / Barra superior */}
        <View className="flex-row items-center justify-between border-b border-[#DCDCDC] pb-4 mb-4">
          <TouchableOpacity
            onPress={() => {
              if (view === "contract") {
                setView("details");
              } else {
                router.push("/inquilino/profileInquilino" as any);
              }
            }}
            className="h-11 w-11 items-center justify-center rounded-full bg-white border border-[#DCDCDC]"
          >
            <ArrowLeft size={20} color="#1C1C1C" />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="font-inter-semibold text-xs uppercase tracking-[0.2em] text-[#B87333]">
              Tu estadía
            </Text>
            <Text className="font-poppins text-base font-semibold text-[#1C1C1C]">
              {view === "contract"
                ? "Constancia de Reserva"
                : "Detalles de tu Solicitud"}
            </Text>
          </View>

          <View className="w-11 items-end">
            {canDeleteFromHistory ? (
              <TouchableOpacity
                onPress={() => setShowActionMenu(!showActionMenu)}
                className="h-11 w-11 items-center justify-center rounded-full"
              >
                <MoreVertical size={20} color="#1C1C1C" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {error ? (
          <AlertMessage
            type="error"
            title="Aviso"
            message={error}
            className="mb-4"
          />
        ) : null}

        {/* Menú de Acción Flotante */}
        {showActionMenu && (
          <View className="self-end mb-3 bg-white border border-[#DCDCDC] rounded-xl shadow-lg p-2">
            <TouchableOpacity
              onPress={() => {
                setShowActionMenu(false);
                setShowDeleteConfirm(true);
              }}
              className="py-2.5 px-3 min-h-[44px] justify-center"
            >
              <Text className="text-[#DC2626] font-inter-medium text-sm">
                Eliminar del historial
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Vista Alternada: Contrato o Detalles */}
        {view === "contract" ? (
          <BookingContract
            reserva={reserva}
            propertyTitle={propertyTitle}
            propertyLocation={propertyLocation}
            totalFinal={totalFinal}
            noches={noches}
            formatPrice={formatPrice}
          />
        ) : (
          <View className="flex-col gap-5">
            {/* Galería de la Propiedad */}
            <View className="relative h-60 w-full rounded-2xl overflow-hidden bg-[#F5F2EC] border border-[#DCDCDC]">
              <Image
                source={{
                  uri: galleryUrls[imagenActual] || PLACEHOLDER_PROPERTY_IMAGE,
                }}
                className="h-full w-full"
                resizeMode="cover"
              />

              {galleryUrls.length > 1 && (
                <>
                  <TouchableOpacity
                    onPress={handlePrevImage}
                    className="absolute left-3 top-1/2 -mt-4 rounded-full bg-white/90 border border-[#DCDCDC] p-2 shadow-sm"
                    style={
                      Platform.OS === "ios"
                        ? { shadowOpacity: 0.1, shadowRadius: 3 }
                        : { elevation: 2 }
                    }
                  >
                    <ChevronLeft size={20} color="#1C1C1C" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleNextImage}
                    className="absolute right-3 top-1/2 -mt-4 rounded-full bg-white/90 border border-[#DCDCDC] p-2 shadow-sm"
                    style={
                      Platform.OS === "ios"
                        ? { shadowOpacity: 0.1, shadowRadius: 3 }
                        : { elevation: 2 }
                    }
                  >
                    <ChevronRight size={20} color="#1C1C1C" />
                  </TouchableOpacity>
                  <View className="absolute bottom-3 left-0 right-0 flex-row justify-center items-center">
                    <View className="flex-row bg-[#1C1C1C]/45 rounded-full px-2.5 py-1 items-center gap-1.5">
                      {galleryUrls.map((_, idx: number) => (
                        <View
                          key={idx}
                          className={`h-2 rounded-full ${
                            idx === imagenActual
                              ? "w-5 bg-[#B8860B]"
                              : "w-2 bg-white/80"
                          }`}
                        />
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Info Resumen de Propiedad */}
            <View className="rounded-2xl border border-[#DCDCDC] bg-white p-5 shadow-sm">
              <Text
                className="font-poppins text-xl font-semibold text-[#1C1C1C]"
                numberOfLines={2}
              >
                {propertyTitle}
              </Text>
              <View className="mt-1.5 flex-row items-center">
                <MapPin size={15} color="#B87333" />
                <Text
                  className="ml-1.5 font-inter text-sm text-[#595959] flex-1"
                  numberOfLines={2}
                >
                  {propertyLocation}
                </Text>
              </View>

              <View
                className={`mt-3 self-start rounded-full border px-3.5 py-1.5 ${statusInfo.bg} ${statusInfo.border}`}
              >
                <Text className={`font-inter-semibold text-xs ${statusInfo.text}`}>
                  {statusInfo.label}
                </Text>
              </View>

              {/* Grid Detalles 2x2 */}
              <View className="mt-5 flex-row flex-wrap justify-between gap-y-3">
                {detailItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <View
                      key={item.label}
                      className="w-[48%] rounded-xl bg-[#FAFAFA] border border-[#DCDCDC] p-3.5"
                    >
                      <View className="flex-row items-center gap-1.5">
                        <Icon size={15} color="#B87333" />
                        <Text className="font-inter-medium text-xs text-[#595959]">
                          {item.label}
                        </Text>
                      </View>
                      <Text
                        className="mt-1.5 font-inter-semibold text-sm text-[#1C1C1C]"
                        numberOfLines={1}
                      >
                        {item.value}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Resumen de Pago */}
            <View className="rounded-2xl bg-[#F5F2EC] border border-[#DCDCDC] p-5 shadow-sm">
              <View className="flex-row items-center gap-2 mb-3">
                <ReceiptText size={18} color="#B87333" />
                <Text className="font-poppins text-base font-semibold text-[#1C1C1C]">
                  Resumen de pago
                </Text>
              </View>

              <View className="flex-col gap-2.5">
                <View className="flex-row justify-between">
                  <Text className="font-inter text-[#595959] text-sm">
                    {formatPrice(precioPorNoche)} × {noches}{" "}
                    {noches === 1 ? "noche" : "noches"}
                  </Text>
                  <Text className="font-inter-medium text-[#1C1C1C] text-sm">
                    {formatPrice(precioBaseTotal)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="font-inter text-[#595959] text-sm">
                    Comisión y otros
                  </Text>
                  <Text className="font-inter-medium text-[#1C1C1C] text-sm">
                    {formatPrice(comisionYOtros)}
                  </Text>
                </View>

                <View className="border-t border-[#DCDCDC] my-1.5" />

                <View className="flex-row justify-between items-center">
                  <Text className="font-inter-semibold text-base text-[#1C1C1C]">
                    {isPaid ? "Total pagado" : "Total a pagar"}
                  </Text>
                  <Text className="font-poppins font-semibold text-lg text-[#B8860B]">
                    {formatPrice(totalFinal)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Acciones Dinámicas según el Estado */}
            {estado === "PENDIENTE" && (
              <View className="rounded-2xl border border-[#B87333]/30 bg-[#F5F2EC] p-6 items-center">
                <Clock size={40} color="#B87333" />
                <Text className="mt-3 font-poppins text-base font-semibold text-[#1C1C1C] text-center">
                  Pendiente de Aprobación
                </Text>
                <Text className="mt-1.5 font-inter text-xs text-[#595959] text-center leading-relaxed">
                  Tu solicitud ha sido enviada al anfitrión. Recibirás una
                  notificación cuando tu reserva sea aceptada.
                </Text>
              </View>
            )}

            {estado === "CONFIRMADA" && !isPaid && (
              <View className="rounded-2xl border border-[#B8860B]/30 bg-[#F5F2EC] p-5 items-center">
                <CheckCircle size={40} color="#B8860B" />
                <Text className="mt-3 font-poppins text-base font-semibold text-[#1C1C1C] text-center">
                  ¡Tu reserva fue aprobada!
                </Text>
                <Text className="mt-1 font-inter text-xs text-[#595959] text-center leading-relaxed">
                  El anfitrión ha confirmado tu solicitud. Completa el pago con
                  PayPal para finalizar tu reserva y desbloquear tu Constancia
                  de Reserva.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (pendingOrderId && pendingApproveLink) {
                      setShowPayPalModal(true);
                    } else {
                      void handleOpenPayPal();
                    }
                  }}
                  disabled={isProcessingPayment}
                  className="mt-4 min-h-[48px] w-full bg-[#B8860B] rounded-xl py-3.5 flex-row items-center justify-center shadow-sm"
                >
                  {isProcessingPayment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <CreditCard size={18} color="white" />
                      <Text className="ml-2 font-inter-medium text-white text-base">
                        {pendingOrderId
                          ? "Continuar Pago con PayPal"
                          : "Pagar y Finalizar Reserva"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {estado === "RECHAZADA" && (
              <View className="rounded-2xl border border-red-200 bg-red-50 p-5 items-center">
                <XCircle size={40} color="#DC2626" />
                <Text className="mt-3 font-poppins text-base font-semibold text-red-800 text-center">
                  Solicitud Rechazada
                </Text>
                <Text className="mt-1 font-inter text-xs text-red-700 text-center">
                  <Text className="font-inter-semibold">
                    Motivo del anfitrión:{" "}
                  </Text>
                  {reserva.motivo_rechazo || "No se especificó un motivo."}
                </Text>
              </View>
            )}

            {estado === "CANCELADA" && (
              <View className="rounded-2xl border border-orange-200 bg-orange-50 p-5 items-center">
                <XCircle size={40} color="#EA580C" />
                <Text className="mt-3 font-poppins text-base font-semibold text-orange-800 text-center">
                  Reserva Cancelada
                </Text>
                <Text className="mt-1 font-inter text-xs text-orange-700 text-center">
                  Esta reserva fue cancelada y ya no se encuentra activa.
                </Text>
              </View>
            )}

            {estado === "CONFIRMADA" && isPaid && (
              <View className="rounded-2xl border border-[#B8860B]/30 bg-[#F5F2EC] p-5">
                <Text className="font-poppins text-base font-semibold text-[#1C1C1C] text-center">
                  ¡Todo listo para tu viaje!
                </Text>
                <Text className="mt-1 font-inter text-xs text-[#595959] text-center leading-relaxed">
                  Tu reserva está confirmada y el pago ha sido procesado. Puedes
                  consultar la constancia de tu reserva.
                </Text>
                <TouchableOpacity
                  onPress={() => setView("contract")}
                  className="mt-4 min-h-[48px] w-full border-[1.5px] border-[#B8860B] bg-white rounded-xl py-3 items-center justify-center"
                >
                  <Text className="font-inter-medium text-[#B8860B] text-sm">
                    Ver Constancia de Reserva
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Tarjeta ¿Necesitas cancelar? */}
            {canCancel && (
              <View className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <Text className="font-poppins text-base font-semibold text-red-800">
                  ¿Necesitas cancelar?
                </Text>
                <Text className="mt-1.5 font-inter text-xs text-red-700 leading-relaxed">
                  Puedes cancelar tu reserva si tus planes han cambiado. Ten en
                  cuenta las políticas de cancelación.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setCancelError("");
                    setShowCancelConfirm(true);
                  }}
                  className="mt-4 min-h-[48px] w-full bg-[#DC2626] rounded-xl py-3.5 items-center justify-center shadow-sm"
                >
                  <Text className="font-inter-medium text-white text-sm">
                    Cancelar Reserva
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Modal de Cancelación */}
        <CancelBookingModal
          key={showCancelConfirm ? "cancel-open" : "cancel-closed"}
          open={showCancelConfirm}
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={(motivo) => void handleCancelarReserva(motivo)}
          isLoading={isCanceling}
          error={cancelError}
          requireReason={false}
          description="¿Estás seguro de que deseas cancelar esta reserva? Puedes indicar el motivo opcionalmente."
        />

        {/* Modal de Proceso de Pago con PayPal */}
        <Modal
          visible={showPayPalModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!isVerifyingPayment) {
              setShowPayPalModal(false);
            }
          }}
        >
          <View className="flex-1 bg-black/50 justify-center items-center px-4">
            <View className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#DCDCDC]">
              <View className="items-center mb-4">
                <View className="h-14 w-14 rounded-full bg-[#B8860B]/15 items-center justify-center mb-3">
                  <CreditCard size={28} color="#B8860B" />
                </View>
                <Text className="font-poppins text-xl font-semibold text-[#1C1C1C] text-center">
                  Pago Seguro con PayPal
                </Text>
                <Text className="font-inter-semibold text-xs text-[#B87333] mt-1">
                  Orden #{pendingOrderId || "En proceso"} •{" "}
                  {formatPrice(totalFinal)}
                </Text>
              </View>

              <View className="rounded-xl bg-[#F5F2EC] p-4 mb-4 border border-[#DCDCDC]">
                <Text className="font-inter text-xs text-[#1C1C1C] leading-5 text-center">
                  1. Inicia sesión con tu cuenta en la ventana de PayPal Sandbox
                  y presiona{" "}
                  <Text className="font-inter-semibold">
                    &quot;Completar compra / Pagar ahora&quot;
                  </Text>
                  .{"\n"}
                  2. Al terminar en PayPal, regresa a esta pantalla: tu pago se
                  detectará automáticamente o puedes presionar{" "}
                  <Text className="font-inter-semibold">
                    &quot;Confirmar pago realizado&quot;
                  </Text>
                  .
                </Text>
              </View>

              {paymentModalError ? (
                <View className="flex-row items-start p-3.5 mb-4 rounded-xl border border-amber-300 bg-amber-50">
                  <AlertCircle size={18} color="#B45309" />
                  <Text className="ml-2 flex-1 font-inter text-xs text-amber-900 leading-4">
                    {paymentModalError}
                  </Text>
                </View>
              ) : null}

              <View className="flex-col gap-3">
                <TouchableOpacity
                  onPress={() => {
                    if (pendingOrderId) {
                      void verifyAndCapturePayment(pendingOrderId, {
                        silentIfUnapproved: false,
                      });
                    }
                  }}
                  disabled={isVerifyingPayment}
                  className={`min-h-[48px] bg-[#B8860B] rounded-xl py-3.5 px-4 flex-row items-center justify-center shadow-sm ${
                    isVerifyingPayment ? "opacity-70" : ""
                  }`}
                >
                  {isVerifyingPayment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <RefreshCw size={17} color="#fff" />
                  )}
                  <Text className="ml-2 font-inter-medium text-white text-sm">
                    {isVerifyingPayment
                      ? "Verificando con PayPal..."
                      : "Ya completé el pago — Confirmar ahora"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => void handleReopenPayPalBrowser()}
                  disabled={isVerifyingPayment}
                  className="min-h-[48px] border-[1.5px] border-[#B8860B] bg-white rounded-xl py-3 px-4 flex-row items-center justify-center"
                >
                  <ExternalLink size={16} color="#B8860B" />
                  <Text className="ml-2 font-inter-medium text-[#B8860B] text-sm">
                    Volver a abrir ventana de PayPal
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowPayPalModal(false)}
                  disabled={isVerifyingPayment}
                  className="min-h-[44px] py-2.5 items-center justify-center"
                >
                  <Text className="font-inter-medium text-xs text-[#595959]">
                    Cerrar ventana temporalmente
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de Pago Exitoso */}
        <Modal
          visible={showPaymentSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPaymentSuccessModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center px-4">
            <View className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#DCDCDC] items-center">
              <View className="h-16 w-16 rounded-full bg-[#B8860B]/15 items-center justify-center mb-4">
                <CheckCircle size={38} color="#B8860B" />
              </View>
              <Text className="font-poppins text-xl font-semibold text-[#1C1C1C] text-center mb-2">
                ¡Pago Realizado con Éxito!
              </Text>
              <Text className="font-inter text-sm text-[#595959] text-center leading-5 mb-5">
                Tu pago en PayPal por{" "}
                <Text className="font-inter-semibold text-[#B8860B]">
                  {formatPrice(totalFinal)}
                </Text>{" "}
                fue confirmado automáticamente. Tu reserva ha quedado finalizada
                y tu Constancia de Reserva ya está disponible.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPaymentSuccessModal(false);
                  setView("contract");
                }}
                className="min-h-[48px] w-full bg-[#B8860B] rounded-xl py-3.5 items-center justify-center shadow-sm"
              >
                <Text className="font-inter-medium text-white text-base">
                  Ver Constancia de Reserva
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal de Eliminación del Historial */}
        <Modal
          visible={showDeleteConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteConfirm(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center px-4">
            <View className="w-full max-w-sm rounded-2xl border border-[#DCDCDC] bg-white p-6 shadow-xl">
              <Text className="font-poppins text-lg font-semibold text-[#1C1C1C] mb-2">
                Eliminar del Historial
              </Text>
              <Text className="font-inter text-sm text-[#595959] leading-relaxed mb-4">
                ¿Estás seguro de que quieres eliminar esta reserva de tu
                historial? Esta acción no se puede deshacer.
              </Text>

              {deleteError ? (
                <Text className="font-inter text-xs text-[#DC2626] mb-4">
                  {deleteError}
                </Text>
              ) : null}

              <View className="flex-row justify-end gap-3">
                <TouchableOpacity
                  onPress={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="min-h-[44px] justify-center px-4 py-2 rounded-xl border-[1.5px] border-[#B8860B]"
                >
                  <Text className="text-[#B8860B] font-inter-medium text-sm">
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => void handleDeleteReservation()}
                  disabled={isDeleting}
                  className="min-h-[44px] justify-center bg-[#DC2626] px-4 py-2 rounded-xl"
                >
                  <Text className="text-white font-inter-medium text-sm">
                    {isDeleting ? "Eliminando..." : "Sí, eliminar"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>

      <BottomTabBar />
    </SafeAreaView>
  );
}

export default DetalleReservaPage;
