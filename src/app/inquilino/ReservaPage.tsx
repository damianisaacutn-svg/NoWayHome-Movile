import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Minus,
  Plus,
  Users,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE_URL, API_URL } from "@/config/api";
import {
  propiedadController,
  type PropiedadItem,
} from "@/controllers/propiedadController";
import { authService } from "@/services/authService";
import { parseDateOnly } from "@/utils/dateUtils";
import { AlertMessage, type AlertVariant } from "./components/AlertMessage";
import { HeaderInquilino } from "./components/headerInquilino";
import { LoadingState } from "./components/LoadingState";
import { PLACEHOLDER_PROPERTY_IMAGE } from "./constants";

function buildEndpointUrl(path: string): string {
  const cleanPath = String(path || "").replace(/^\/api(?=\/|$)/, "");
  const normalizedPath = cleanPath.startsWith("/")
    ? cleanPath
    : `/${cleanPath}`;
  return `${API_URL}${normalizedPath}`;
}

function resolveImageUri(raw: unknown): string {
  if (!raw || typeof raw !== "string") return PLACEHOLDER_PROPERTY_IMAGE;
  const trimmed = raw.trim();
  if (!trimmed) return PLACEHOLDER_PROPERTY_IMAGE;
  if (/^(https?:\/\/|data:image\/)/i.test(trimmed)) return trimmed;
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function getStoredUser(): Record<string, any> | null {
  const session = authService.getSession();
  if (session?.user && typeof session.user === "object") {
    return session.user as Record<string, any>;
  }
  const rawStored = authService.getStorageItem("user");
  if (rawStored) {
    try {
      return JSON.parse(rawStored);
    } catch {
      return null;
    }
  }
  return null;
}

function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEK_DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

interface CalendarPickerModalProps {
  visible: boolean;
  title: string;
  selectedDateStr: string;
  minDate: Date;
  onSelectDate: (isoDate: string) => void;
  onClose: () => void;
}

function CalendarPickerModal({
  visible,
  title,
  selectedDateStr,
  minDate,
  onSelectDate,
  onClose,
}: CalendarPickerModalProps) {
  const initialDate = parseDateOnly(selectedDateStr) || minDate || new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const cleanMinDate = useMemo(() => {
    const d = new Date(minDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [minDate]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 px-4">
        <View className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-poppins text-lg font-semibold text-[#5F5F5F]">
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={20} color="#5F5F5F" />
            </TouchableOpacity>
          </View>

          {/* Navegación de Mes */}
          <View className="flex-row items-center justify-between mb-4 bg-[#FAFAFA] rounded-xl p-2 border border-[#6B8E23]/15">
            <TouchableOpacity
              onPress={handlePrevMonth}
              className="p-2 rounded-lg bg-white"
            >
              <ChevronLeft size={18} color="#5F5F5F" />
            </TouchableOpacity>
            <Text className="font-poppins font-semibold text-base text-[#5F5F5F]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity
              onPress={handleNextMonth}
              className="p-2 rounded-lg bg-white"
            >
              <ChevronRight size={18} color="#5F5F5F" />
            </TouchableOpacity>
          </View>

          {/* Cabecera de días */}
          <View className="flex-row mb-2">
            {WEEK_DAYS.map((wd) => (
              <View key={wd} className="flex-1 items-center">
                <Text className="text-xs font-semibold text-[#A67C52]">
                  {wd}
                </Text>
              </View>
            ))}
          </View>

          {/* Cuadrícula de días */}
          <View className="flex-row flex-wrap">
            {cells.map((day, idx) => {
              if (day === null) {
                return <View key={`empty-${idx}`} className="w-[14.28%] h-10" />;
              }

              const cellDate = new Date(viewYear, viewMonth, day);
              cellDate.setHours(0, 0, 0, 0);
              const isoStr = toIsoDateString(cellDate);
              const isDisabled = cellDate < cleanMinDate;
              const isSelected = selectedDateStr === isoStr;

              return (
                <TouchableOpacity
                  key={isoStr}
                  disabled={isDisabled}
                  onPress={() => {
                    onSelectDate(isoStr);
                    onClose();
                  }}
                  className="w-[14.28%] h-10 items-center justify-center"
                >
                  <View
                    className={`h-9 w-9 rounded-full items-center justify-center ${
                      isSelected
                        ? "bg-[#6B8E23]"
                        : isDisabled
                          ? "bg-transparent"
                          : "bg-[#FAFAFA]"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        isSelected
                          ? "text-white font-bold"
                          : isDisabled
                            ? "text-gray-300"
                            : "text-[#5F5F5F] font-medium"
                      }`}
                    >
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={onClose}
            className="mt-4 border border-[#6B8E23] rounded-xl py-2.5 items-center"
          >
            <Text className="text-[#6B8E23] font-semibold text-sm">Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function ReservaPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [userData, setUserData] = useState<Record<string, any> | null>(() =>
    getStoredUser(),
  );
  const [propiedad, setPropiedad] = useState<PropiedadItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [huespedes, setHuespedes] = useState(1);
  const [message, setMessage] = useState<{
    type: AlertVariant | "";
    title: string;
    text: string;
  }>({ type: "", title: "", text: "" });

  const [showPickerInicio, setShowPickerInicio] = useState(false);
  const [showPickerFin, setShowPickerFin] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const minEndDate = useMemo(() => {
    const startParsed = parseDateOnly(fechaInicio);
    if (startParsed) {
      const nextDay = new Date(startParsed);
      nextDay.setDate(nextDay.getDate() + 1);
      return nextDay;
    }
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }, [fechaInicio, today]);

  useEffect(() => {
    let isMounted = true;

    const fetchDatos = async () => {
      try {
        const storedUser = getStoredUser();
        if (!storedUser) {
          router.replace("/loginPage" as any);
          return;
        }
        if (isMounted) {
          setUserData(storedUser);
        }

        if (!id) {
          if (isMounted) {
            setMessage({
              type: "error",
              title: "Propiedad no encontrada",
              text: "Falta el identificador de la propiedad.",
            });
            setIsLoading(false);
          }
          return;
        }

        const result = await propiedadController.cargarDetallesPropiedad(id);
        if (!isMounted) return;

        if (result.success && result.data) {
          setPropiedad(result.data);
        } else {
          setMessage({
            type: "error",
            title: "No pudimos cargar la propiedad",
            text: result.error || "Intenta nuevamente desde el catálogo.",
          });
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setMessage({
          type: "error",
          title: "Error de conexión",
          text:
            err instanceof Error
              ? err.message
              : "No se pudieron recuperar los datos.",
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchDatos();

    return () => {
      isMounted = false;
    };
  }, [id, router]);

  const costos = useMemo(() => {
    if (!fechaInicio || !fechaFin || !propiedad) return null;
    const start = parseDateOnly(fechaInicio);
    const end = parseDateOnly(fechaFin);
    if (!start || !end || end <= start) return null;

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (dias <= 0) return null;

    const precioNoche = Number(
      propiedad.precio_noche ??
        propiedad.precio_por_noche ??
        propiedad.precio ??
        0,
    );
    const subtotal = precioNoche * dias;
    const comision = subtotal * 0.1;
    const total = subtotal + comision;

    return {
      dias,
      precioNoche,
      subtotal,
      comision,
      total,
    };
  }, [fechaInicio, fechaFin, propiedad]);

  const maxHuespedes = Number(
    propiedad?.capacidad ?? propiedad?.huespedes ?? propiedad?.max_huespedes ?? 10,
  );

  const handleSelectInicio = (isoStr: string) => {
    setFechaInicio(isoStr);
    const newStart = parseDateOnly(isoStr);
    const currentEnd = parseDateOnly(fechaFin);
    if (newStart && currentEnd && currentEnd <= newStart) {
      setFechaFin("");
    }
  };

  const handleSolicitarReserva = async () => {
    if (!costos || !propiedad || !fechaInicio || !fechaFin) {
      setMessage({
        type: "error",
        title: "Datos incompletos",
        text: "Por favor completa las fechas de entrada y salida antes de continuar.",
      });
      return;
    }

    const activeUser = userData || getStoredUser();
    const idInquilino = activeUser?.id_inquilino ?? activeUser?.id;
    const idPropiedad = propiedad?.id_propiedad ?? propiedad?.id ?? id;

    if (!idInquilino) {
      Alert.alert(
        "Sesión requerida",
        "Por favor inicia sesión como huésped para solicitar una reserva.",
        [
          {
            text: "Ir a Login",
            onPress: () => router.replace("/loginPage" as any),
          },
        ],
      );
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: "", title: "", text: "" });

    const reservationData = {
      id_inquilino: idInquilino,
      id_propiedad: idPropiedad,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      huespedes,
      pago: costos.total,
    };

    try {
      const response = await fetch(buildEndpointUrl("/inquilino/reservas"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reservationData),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.ok === false) {
        throw new Error(
          result.message ||
            result.error ||
            "No se pudo procesar la solicitud de reserva.",
        );
      }

      const createdReserva =
        result.reservation || result.reserva || result.data || result;
      const reservaId =
        createdReserva?.id_reserva ||
        createdReserva?.id ||
        result?.id_reserva ||
        result?.id;

      if (reservaId) {
        router.replace({
          pathname: "/inquilino/detallesReservaPage" as any,
          params: { idReserva: String(reservaId) },
        });
      } else {
        Alert.alert(
          "Reserva solicitada",
          "El anfitrión ha sido notificado. Puedes consultar el estado en tu perfil.",
          [
            {
              text: "Ir a mi Perfil",
              onPress: () =>
                router.replace("/inquilino/profileInquilino" as any),
            },
          ],
        );
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        title: "Error en la solicitud",
        text:
          err instanceof Error
            ? err.message
            : "Ocurrió un error al registrar tu reserva.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number | string | null | undefined) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(Number(price) || 0);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (id) {
      router.push({
        pathname: "/inquilino/detallesPropiedadPage" as any,
        params: { id: String(id) },
      });
    } else {
      router.push("/inquilino/ExplorarPage" as any);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["top", "left", "right"]}
      >
        <StatusBar style="dark" />
        <HeaderInquilino />
        <View className="flex-1 bg-[#FAFAFA] justify-center items-center">
          <LoadingState message="Preparando tu reserva..." />
        </View>
      </SafeAreaView>
    );
  }

  if (!propiedad) {
    return (
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["top", "left", "right"]}
      >
        <StatusBar style="dark" />
        <HeaderInquilino />
        <View className="flex-1 bg-[#FAFAFA] px-4 py-8 justify-center items-center">
          <AlertMessage
            type="error"
            title={message.title || "Propiedad no disponible"}
            message={
              message.text ||
              "No pudimos encontrar los datos de esta propiedad."
            }
            className="mb-6 w-full"
          />
          <TouchableOpacity
            onPress={() => router.push("/inquilino/ExplorarPage" as any)}
            className="bg-[#6B8E23] rounded-xl px-6 py-3.5"
          >
            <Text className="text-white font-semibold">Volver al catálogo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const propertyTitle =
    propiedad.titulo ||
    propiedad.titulo_propiedad ||
    propiedad.nombre_propiedad ||
    propiedad.nombre ||
    propiedad.descripcion ||
    "Propiedad";
  const propertyLocation =
    propiedad.ubicacion ||
    propiedad.direccion ||
    propiedad.ciudad ||
    "Ubicación no especificada";
  const propertyImage = resolveImageUri(
    propiedad.imagen_principal ||
      propiedad.imagen ||
      (Array.isArray(propiedad.imagenes) && propiedad.imagenes[0]
        ? typeof propiedad.imagenes[0] === "string"
          ? propiedad.imagenes[0]
          : propiedad.imagenes[0]?.url || propiedad.imagenes[0]?.imagen_url
        : null),
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <HeaderInquilino />

      <ScrollView
        className="flex-1 bg-[#FAFAFA] px-4 py-6"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Botón Volver */}
        <TouchableOpacity
          onPress={handleBack}
          className="flex-row items-center mb-5 self-start"
        >
          <ArrowLeft size={20} color="#A67C52" />
          <Text className="ml-2 text-sm font-medium text-[#5F5F5F]">
            Volver a la propiedad
          </Text>
        </TouchableOpacity>

        {/* Mensaje de Alerta */}
        {message.text ? (
          <AlertMessage
            type={message.type || "error"}
            title={message.title}
            message={message.text}
            className="mb-6"
          />
        ) : null}

        {/* Encabezado e Imagen de la Propiedad */}
        <View className="mb-6 bg-white rounded-2xl p-4 border border-[#6B8E23]/10 shadow-sm">
          <View className="w-full h-48 rounded-xl overflow-hidden bg-[#F2E8CF] mb-4">
            <Image
              source={{ uri: propertyImage }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
          <Text className="font-poppins text-xl font-semibold text-[#5F5F5F] mb-1.5">
            {propertyTitle}
          </Text>
          <View className="flex-row items-center">
            <MapPin size={16} color="#A67C52" />
            <Text
              className="ml-1.5 text-sm text-[#5F5F5F]/80 flex-1"
              numberOfLines={1}
            >
              {propertyLocation}
            </Text>
          </View>
        </View>

        {/* Tarjeta del Formulario de Reserva */}
        <View className="bg-white rounded-2xl border border-[#6B8E23]/10 p-5 shadow-sm mb-6">
          <Text className="font-poppins text-xl font-semibold text-[#5F5F5F] mb-5">
            Completa los datos de tu reserva
          </Text>

          {/* Selectores de Fechas */}
          <View className="flex-col gap-4 mb-5">
            <View>
              <Text className="text-sm font-medium text-[#5F5F5F]/80 mb-2">
                Fecha de Entrada
              </Text>
              <TouchableOpacity
                onPress={() => setShowPickerInicio(true)}
                className="h-12 border border-[#6B8E23]/20 rounded-xl px-4 flex-row items-center justify-between bg-[#FAFAFA]"
              >
                <Text
                  className={`text-base ${
                    fechaInicio
                      ? "text-[#5F5F5F] font-medium"
                      : "text-[#5F5F5F]/45"
                  }`}
                >
                  {fechaInicio || "Seleccionar fecha (AAAA-MM-DD)"}
                </Text>
                <CalendarIcon size={18} color="#A67C52" />
              </TouchableOpacity>
            </View>

            <View>
              <Text className="text-sm font-medium text-[#5F5F5F]/80 mb-2">
                Fecha de Salida
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (fechaInicio) setShowPickerFin(true);
                }}
                disabled={!fechaInicio}
                className={`h-12 border border-[#6B8E23]/20 rounded-xl px-4 flex-row items-center justify-between ${
                  !fechaInicio ? "bg-gray-100 opacity-60" : "bg-[#FAFAFA]"
                }`}
              >
                <Text
                  className={`text-base ${
                    fechaFin
                      ? "text-[#5F5F5F] font-medium"
                      : "text-[#5F5F5F]/45"
                  }`}
                >
                  {fechaFin || "Seleccionar fecha (AAAA-MM-DD)"}
                </Text>
                <CalendarIcon
                  size={18}
                  color={!fechaInicio ? "#9CA3AF" : "#A67C52"}
                />
              </TouchableOpacity>
            </View>

            {/* Selector de Huéspedes */}
            <View>
              <Text className="text-sm font-medium text-[#5F5F5F]/80 mb-2">
                Huéspedes
              </Text>
              <View className="h-12 border border-[#6B8E23]/20 rounded-xl px-4 flex-row items-center justify-between bg-[#FAFAFA]">
                <View className="flex-row items-center gap-2">
                  <Users size={18} color="#A67C52" />
                  <Text className="text-base font-medium text-[#5F5F5F]">
                    {huespedes} {huespedes === 1 ? "huésped" : "huéspedes"}
                  </Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <TouchableOpacity
                    disabled={huespedes <= 1}
                    onPress={() => setHuespedes((h) => Math.max(1, h - 1))}
                    className={`h-8 w-8 rounded-full border border-[#6B8E23]/30 items-center justify-center bg-white ${
                      huespedes <= 1 ? "opacity-40" : ""
                    }`}
                  >
                    <Minus size={14} color="#5F5F5F" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={huespedes >= maxHuespedes}
                    onPress={() =>
                      setHuespedes((h) => Math.min(maxHuespedes, h + 1))
                    }
                    className={`h-8 w-8 rounded-full border border-[#6B8E23]/30 items-center justify-center bg-white ${
                      huespedes >= maxHuespedes ? "opacity-40" : ""
                    }`}
                  >
                    <Plus size={14} color="#5F5F5F" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Resumen de Precios */}
          {costos ? (
            <View className="rounded-2xl bg-[#F2E8CF] p-5 mb-6">
              <Text className="font-poppins font-semibold text-base text-[#5F5F5F] mb-3">
                Resumen de pago
              </Text>
              <View className="flex-col gap-2 mb-3">
                <View className="flex-row justify-between">
                  <Text className="text-sm text-[#5F5F5F]/85">
                    {formatPrice(costos.precioNoche)} × {costos.dias}{" "}
                    {costos.dias === 1 ? "noche" : "noches"}
                  </Text>
                  <Text className="text-sm font-medium text-[#5F5F5F]">
                    {formatPrice(costos.subtotal)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-[#5F5F5F]/85">
                    Comisión y otros
                  </Text>
                  <Text className="text-sm font-medium text-[#5F5F5F]">
                    {formatPrice(costos.comision)}
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between items-center border-t border-[#A67C52]/20 pt-3">
                <Text className="font-semibold text-base text-[#5F5F5F]">
                  Total a pagar
                </Text>
                <Text className="font-poppins font-bold text-xl text-[#6B8E23]">
                  {formatPrice(costos.total)}
                </Text>
              </View>
            </View>
          ) : null}

          <Text className="text-xs text-center text-[#5F5F5F]/80 mb-5 leading-relaxed">
            Al hacer clic en &quot;Solicitar Reserva&quot;, tu solicitud será
            enviada al anfitrión para su aprobación. No se te cobrará nada en
            este momento.
          </Text>

          {/* Botón de Enviar */}
          <TouchableOpacity
            onPress={() => void handleSolicitarReserva()}
            disabled={!costos || !fechaInicio || !fechaFin || isSubmitting}
            className={`h-14 rounded-xl bg-[#6B8E23] items-center justify-center ${
              !costos || !fechaInicio || !fechaFin || isSubmitting
                ? "opacity-60"
                : ""
            }`}
          >
            {isSubmitting ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#fff" />
                <Text className="text-white font-semibold text-base">
                  Enviando Solicitud...
                </Text>
              </View>
            ) : (
              <Text className="text-white font-semibold text-base">
                Solicitar Reserva
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <CalendarPickerModal
          visible={showPickerInicio}
          title="Selecciona fecha de entrada"
          selectedDateStr={fechaInicio}
          minDate={today}
          onSelectDate={handleSelectInicio}
          onClose={() => setShowPickerInicio(false)}
        />

        <CalendarPickerModal
          visible={showPickerFin}
          title="Selecciona fecha de salida"
          selectedDateStr={fechaFin}
          minDate={minEndDate}
          onSelectDate={setFechaFin}
          onClose={() => setShowPickerFin(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

export default ReservaPage;
