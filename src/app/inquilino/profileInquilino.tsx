import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  Edit,
  Eye,
  EyeOff,
  Heart,
  Lock,
  Mail,
  MapPin,
  Phone,
  Settings,
  Star,
  X,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_URL } from "@/config/api";
import { authController } from "../../controllers/authController";
import { inquilinoController } from "@/controllers/inquilinoController";
import { authService } from "@/services/authService";
import {
  extraerTituloPropiedadDeReserva,
  notificarReservaCanceladaPorInquilino,
} from "@/services/notificationSyncService";
import { tenantBookingService } from "@/services/tenantBookingService";
import { parseDateOnly } from "@/utils/dateUtils";
import {
  getLandlordId,
  getStoredSessionUser as getSessionUserFromStorage,
  getTenantId,
  hasValidId,
  pickValidId,
  resolveUserRole,
} from "@/utils/sessionRole";
import { BottomTabBar } from "../../components/BottomTabBar";
import { CancelBookingModal } from "../../components/CancelBookingModal";
import { ConfirmActionModal } from "../../components/ConfirmActionModal";
import { HeaderInquilino } from "../../components/headerInquilino";

export interface TenantProfileData {
  id?: number | string;
  id_inquilino?: number | string;
  nombre?: string;
  correo?: string;
  email?: string;
  telefono?: string;
  role?: string;
  rol?: string;
  [key: string]: any;
}

function buildEndpointUrl(path: string): string {
  const cleanPath = String(path || "").replace(/^\/api(?=\/|$)/, "");
  const normalizedPath = cleanPath.startsWith("/")
    ? cleanPath
    : `/${cleanPath}`;
  return `${API_URL}${normalizedPath}`;
}

function formatDateLong(rawDate?: string | null): string {
  if (!rawDate) return "Fecha por confirmar";
  const parsed = parseDateOnly(rawDate) || new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return String(rawDate);
  }
  return parsed.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface EditInquilinoModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: TenantProfileData;
  onUpdateSuccess: (updatedUser: TenantProfileData) => void;
}

function EditInquilinoModal({
  isOpen,
  onClose,
  userData,
  onUpdateSuccess,
}: EditInquilinoModalProps) {
  const [nombre, setNombre] = useState(userData?.nombre || "");
  const [telefono, setTelefono] = useState(userData?.telefono || "");
  const [errors, setErrors] = useState<{ nombre?: string; telefono?: string }>(
    {},
  );
  const [serverError, setServerError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = () => {
    if (isSaving) return;
    setErrors({});
    setServerError("");
    onClose();
  };

  const handleSave = async () => {
    const nextErrors: { nombre?: string; telefono?: string } = {};
    const cleanPhone = telefono.trim().replace(/\D/g, "");

    if (!nombre.trim()) {
      nextErrors.nombre = "El nombre es obligatorio.";
    }

    if (
      telefono.trim() &&
      (cleanPhone.length < 7 || cleanPhone.length > 20)
    ) {
      nextErrors.telefono = "Ingresa un teléfono válido.";
    }

    setErrors(nextErrors);
    setServerError("");

    if (Object.values(nextErrors).some(Boolean)) return;

    const userId = getTenantId(userData);
    if (!userId) {
      setServerError("No se pudo identificar tu cuenta de inquilino.");
      return;
    }

    try {
      setIsSaving(true);
      const result = await inquilinoController.actualizarPerfil(userId, {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
      });

      if (!result.success) {
        setServerError(
          result.error || "No se pudo actualizar tu información.",
        );
        return;
      }

      const updatedUser: TenantProfileData = {
        ...userData,
        ...(result.data || {}),
        nombre: result.data?.nombre || nombre.trim(),
        telefono: result.data?.telefono ?? telefono.trim(),
      };

      onUpdateSuccess(updatedUser);
      onClose();
    } catch (err: unknown) {
      setServerError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar tu información.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 px-4">
        <View className="w-full max-w-lg bg-white border border-[#DCDCDC] rounded-2xl p-6 shadow-xl">
          <View className="mb-5">
            <Text className="font-poppins text-xl font-semibold text-[#1C1C1C]">
              Editar información personal
            </Text>
            <Text className="mt-2 font-inter text-sm text-[#595959]">
              Actualiza los datos visibles en tu perfil de huésped.
            </Text>
          </View>

          {serverError ? (
            <View className="flex-row items-center p-3 mb-4 rounded-xl border border-red-200 bg-red-50">
              <AlertCircle size={18} color="#DC2626" />
              <Text className="ml-2 flex-1 font-inter text-sm text-red-800">
                {serverError}
              </Text>
            </View>
          ) : null}

          <View className="flex-col gap-4">
            <View>
              <Text className="font-inter-medium text-[#1C1C1C] mb-2">
                Nombre
              </Text>
              <TextInput
                value={nombre}
                onChangeText={(text) => {
                  setNombre(text);
                  setErrors((prev) => ({ ...prev, nombre: undefined }));
                }}
                className="h-12 px-4 rounded-xl border border-[#DCDCDC] focus:border-[#B8860B] font-inter-medium text-[#1C1C1C] bg-[#FAFAFA]"
                placeholderTextColor="#7A7A7A"
              />
              {errors.nombre ? (
                <View className="mt-1.5 flex-row items-center gap-1.5">
                  <AlertCircle size={14} color="#DC2626" />
                  <Text className="font-inter text-xs text-red-700">
                    {errors.nombre}
                  </Text>
                </View>
              ) : null}
            </View>

            <View>
              <Text className="font-inter-medium text-[#1C1C1C] mb-2">
                Teléfono
              </Text>
              <TextInput
                value={telefono}
                onChangeText={(text) => {
                  setTelefono(text);
                  setErrors((prev) => ({ ...prev, telefono: undefined }));
                }}
                keyboardType="phone-pad"
                className="h-12 px-4 rounded-xl border border-[#DCDCDC] focus:border-[#B8860B] font-inter-medium text-[#1C1C1C] bg-[#FAFAFA]"
                placeholderTextColor="#7A7A7A"
              />
              {errors.telefono ? (
                <View className="mt-1.5 flex-row items-center gap-1.5">
                  <AlertCircle size={14} color="#DC2626" />
                  <Text className="font-inter text-xs text-red-700">
                    {errors.telefono}
                  </Text>
                </View>
              ) : null}
            </View>

            <View>
              <Text className="font-inter-medium text-[#1C1C1C] mb-2">
                Correo
              </Text>
              <TextInput
                value={userData?.correo || userData?.email || ""}
                editable={false}
                className="h-12 px-4 rounded-xl border border-[#DCDCDC] bg-[#DCDCDC]/35 font-inter-medium text-[#1C1C1C] opacity-75"
              />
              <Text className="mt-2 font-inter text-xs text-[#595959]">
                El correo se usa para iniciar sesión y no puede modificarse
                desde esta sección.
              </Text>
            </View>

            <View className="flex-col gap-3 mt-4">
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                className={`min-h-[48px] bg-[#B8860B] rounded-xl py-3 items-center justify-center flex-row ${
                  isSaving ? "opacity-60" : ""
                }`}
              >
                {isSaving && (
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                    className="mr-2"
                  />
                )}
                <Text className="font-inter-medium text-white">
                  {isSaving ? "Guardando..." : "Guardar cambios"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClose}
                disabled={isSaving}
                className="min-h-[48px] border-[1.5px] border-[#B8860B] rounded-xl py-3 items-center justify-center"
              >
                <Text className="font-inter-medium text-[#B8860B]">
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData?: TenantProfileData | null;
}

function ChangePasswordModal({
  isOpen,
  onClose,
  userData,
}: ChangePasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (isSubmitting) return;
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    onClose();
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    const userId = getTenantId(userData) ?? undefined;
    const result = await authController.updatePassword({
      userId,
      role: "inquilino",
      password,
      confirmPassword,
    });

    setIsSubmitting(false);

    if (result.success) {
      setSuccess(result.message || "Contraseña actualizada correctamente.");
      setPassword("");
      setConfirmPassword("");
    } else {
      setError(result.message || "No se pudo actualizar la contraseña.");
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 px-4">
        <View className="w-full max-w-lg bg-white border border-[#DCDCDC] rounded-2xl p-6 shadow-xl">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-poppins text-xl font-semibold text-[#1C1C1C]">
              Cambiar contraseña
            </Text>
            <TouchableOpacity onPress={handleClose} className="p-1.5">
              <X size={20} color="#1C1C1C" />
            </TouchableOpacity>
          </View>

          {error || success ? (
            <View
              className={`flex-row items-center p-3 mb-4 rounded-xl border ${
                success
                  ? "border-[#B8860B]/35 bg-[#F5F2EC]"
                  : "border-red-200 bg-red-50"
              }`}
            >
              {success ? (
                <CheckCircle2 size={18} color="#B8860B" />
              ) : (
                <AlertCircle size={18} color="#DC2626" />
              )}
              <Text
                className={`ml-2 flex-1 font-inter text-sm ${
                  success ? "text-[#1C1C1C]" : "text-red-800"
                }`}
              >
                {success || error}
              </Text>
            </View>
          ) : null}

          <View className="flex-col gap-4">
            <View>
              <Text className="font-inter-medium text-[#1C1C1C] mb-2">
                Nueva contraseña
              </Text>
              <View className="relative justify-center">
                <TextInput
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#7A7A7A"
                  className="h-12 pl-4 pr-12 rounded-xl border border-[#DCDCDC] focus:border-[#B8860B] font-inter-medium text-[#1C1C1C] bg-[#FAFAFA]"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 p-1"
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#595959" />
                  ) : (
                    <Eye size={20} color="#595959" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text className="font-inter-medium text-[#1C1C1C] mb-2">
                Confirmar nueva contraseña
              </Text>
              <View className="relative justify-center">
                <TextInput
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repite tu nueva contraseña"
                  placeholderTextColor="#7A7A7A"
                  className="h-12 pl-4 pr-12 rounded-xl border border-[#DCDCDC] focus:border-[#B8860B] font-inter-medium text-[#1C1C1C] bg-[#FAFAFA]"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-4 p-1"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#595959" />
                  ) : (
                    <Eye size={20} color="#595959" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-col gap-3 mt-2">
              <TouchableOpacity
                onPress={() => {
                  setIsSubmitting(true);
                  void handleSubmit();
                }}
                disabled={isSubmitting}
                className={`min-h-[48px] bg-[#B8860B] rounded-xl py-3 items-center justify-center flex-row ${
                  isSubmitting ? "opacity-60" : ""
                }`}
              >
                {isSubmitting && (
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                    className="mr-2"
                  />
                )}
                <Text className="font-inter-medium text-white">
                  {isSubmitting ? "Actualizando..." : "Guardar contraseña"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleClose}
                disabled={isSubmitting}
                className="min-h-[48px] border-[1.5px] border-[#B8860B] rounded-xl py-3 items-center justify-center"
              >
                <Text className="font-inter-medium text-[#B8860B]">Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Modal de cancelación reutilizado desde ../../components/CancelBookingModal

export function ProfilePage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;

  const [sessionUser, setSessionUser] = useState<TenantProfileData | null>(
    () => getSessionUserFromStorage() as TenantProfileData | null,
  );
  const [sessionRole, setSessionRole] = useState<string | null>(
    () => authService.getSession()?.role ?? null,
  );
  const [fetchedProfile, setFetchedProfile] =
    useState<TenantProfileData | null>(null);

  const userData = useMemo<TenantProfileData>(() => {
    return {
      ...(sessionUser || {}),
      ...(fetchedProfile || {}),
    };
  }, [sessionUser, fetchedProfile]);

  const [reservas, setReservas] = useState<Record<string, any>[]>([]);
  const [favoritos, setFavoritos] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const normalizedRequestedTab =
    requestedTab === "bookings" ||
    requestedTab === "favorites" ||
    requestedTab === "settings"
      ? requestedTab
      : undefined;
  const [localTab, setLocalTab] = useState<
    "bookings" | "favorites" | "settings"
  >("bookings");
  const activeTab = normalizedRequestedTab ?? localTab;
  const setActiveTab = (nextTab: "bookings" | "favorites" | "settings") => {
    setLocalTab(nextTab);
    if (normalizedRequestedTab) {
      router.setParams({ tab: nextTab } as any);
    }
  };
  const [confirmSwitchHostOpen, setConfirmSwitchHostOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [bookingToCancel, setBookingToCancel] = useState<Record<
    string,
    any
  > | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationError, setCancellationError] = useState("");
  const [notifPreferences, setNotifPreferences] = useState({
    ofertas: true,
    recordatorios: true,
    newsletter: false,
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
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
    const unsubscribe = authService.subscribe((nextSession) => {
      if (!nextSession?.isAuthenticated) {
        setSessionUser(null);
        setSessionRole(null);
        setFetchedProfile(null);
        return;
      }
      setSessionRole(nextSession?.role ?? null);
      setSessionUser(
        (getSessionUserFromStorage() as TenantProfileData | null) ||
          (nextSession?.user as TenantProfileData | null) ||
          null,
      );
    });
    return unsubscribe;
  }, []);

  const resolvedRole = useMemo(
    () => resolveUserRole(sessionUser, sessionRole),
    [sessionRole, sessionUser],
  );

  const userId = useMemo(() => {
    return (
      getTenantId(sessionUser, sessionRole) ??
      getTenantId(fetchedProfile, sessionRole)
    );
  }, [fetchedProfile, sessionRole, sessionUser]);

  const landlordId = useMemo(
    () => getLandlordId(sessionUser, sessionRole),
    [sessionRole, sessionUser],
  );

  const isTenantAccount = Boolean(
    sessionUser &&
      (resolvedRole !== "arrendatario" || hasValidId(sessionUser?.id_inquilino)),
  );

  const isAuthorizedTenant = Boolean(
    isTenantAccount && hasValidId(userId),
  );

  const shouldRedirectToLandlord = Boolean(
    authService.isAuthenticated() &&
      sessionUser &&
      resolvedRole === "arrendatario" &&
      !hasValidId(sessionUser?.id_inquilino) &&
      hasValidId(landlordId),
  );

  useEffect(() => {
    if (shouldRedirectToLandlord) {
      router.replace("/arrendatario/profileArrendatario" as any);
    }
  }, [router, shouldRedirectToLandlord]);

  const syncUserInSession = useCallback((nextUserData: TenantProfileData) => {
    const currentSession = authService.getSession();
    if (!currentSession?.isAuthenticated) {
      return;
    }
    const currentUser =
      (currentSession?.user as TenantProfileData) ||
      (getSessionUserFromStorage() as TenantProfileData | null) ||
      {};
    const resolvedTenantId = pickValidId(
      nextUserData.id_inquilino,
      nextUserData.id,
      currentUser?.id_inquilino,
      currentUser?.id,
    );
    const resolvedBaseId = pickValidId(
      nextUserData.id,
      currentUser?.id,
      resolvedTenantId,
    );
    const mergedUser: TenantProfileData = {
      ...currentUser,
      ...nextUserData,
      ...(resolvedBaseId !== null ? { id: resolvedBaseId } : {}),
      ...(resolvedTenantId !== null ? { id_inquilino: resolvedTenantId } : {}),
      role: "inquilino",
      rol: "inquilino",
    };

    const isSameSessionState =
      JSON.stringify(currentSession.user ?? null) ===
        JSON.stringify(mergedUser) && currentSession.role === "inquilino";
    if (isSameSessionState) {
      return;
    }

    authService.setStorageItem("user", JSON.stringify(mergedUser));
    authService.setSession({
      ...currentSession,
      user: mergedUser,
      role: "inquilino",
      token: currentSession?.token || null,
    });
  }, []);

  useEffect(() => {
    if (!isAuthorizedTenant || !userId) {
      return;
    }

    let isMounted = true;

    const fetchPerfil = async () => {
      try {
        setIsLoading(true);
        const result = await inquilinoController.cargarPerfilCompleto(userId);
        if (!isMounted) return;

        if (result.success && result.data) {
          const nextProfile = result.data.perfil || {};
          setFetchedProfile((prev) => ({
            ...(prev || {}),
            ...nextProfile,
          }));
          syncUserInSession(nextProfile);

          const reservasVisibles = (result.data.reservas || []).filter(
            (reserva: Record<string, any>) => !reserva.oculto_para_inquilino,
          );
          const normalizedReservas = reservasVisibles.map(
            (reserva: Record<string, any>) => {
              const navigationId = reserva.id_reserva || null;

              return {
                ...reserva,
                id_navegacion: navigationId,
                fecha_entrada: reserva.fecha_entrada || reserva.fecha_inicio,
                fecha_salida: reserva.fecha_salida || reserva.fecha_fin,
                estado: reserva.estado_reserva || reserva.estado,
                estado_reserva: reserva.estado_reserva || reserva.estado,
                precio_base:
                  reserva.precio_base ??
                  (reserva.precio ||
                    reserva.precio_noche ||
                    reserva.precio_por_noche ||
                    0),
                comision_y_otros:
                  reserva.comision_y_otros ??
                  reserva.tarifa_servicio ??
                  reserva.tarifa ??
                  0,
                total_pagado:
                  reserva.total_pagado ?? reserva.pago ?? reserva.total ?? 0,
                titulo:
                  reserva.titulo ||
                  reserva.titulo_propiedad ||
                  reserva.propiedad?.titulo ||
                  reserva.nombre_propiedad ||
                  reserva.title ||
                  reserva.propiedad?.nombre,
                ubicacion:
                  reserva.ubicacion ||
                  reserva.ubicacion_propiedad ||
                  reserva.direccion ||
                  reserva.propiedad?.direccion ||
                  reserva.propiedad?.ubicacion ||
                  reserva.propiedad?.ciudad ||
                  "",
                imagen_principal:
                  reserva.imagen_principal ||
                  reserva.imagen_portada ||
                  reserva.propiedad?.imagen_principal ||
                  reserva.propiedad?.imagen ||
                  null,
              };
            },
          );
          setReservas(normalizedReservas);
          setFavoritos(result.data.favoritos || []);
        } else {
          setLoadError(
            result.error || "No se pudo cargar tu información completa.",
          );
        }
      } catch {
        if (!isMounted) return;
        setLoadError("Error al cargar la información del perfil.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchPerfil();

    return () => {
      isMounted = false;
    };
  }, [userId, isAuthorizedTenant, syncUserInSession, refreshTrigger]);

  const handleUpdateSuccess = (updatedUser: TenantProfileData) => {
    setFetchedProfile((prev) => ({
      ...(prev || {}),
      ...updatedUser,
    }));
    syncUserInSession(updatedUser);
  };

  const handleRemoveFavorito = async (propiedadId: number | string) => {
    const currentUserId = getTenantId(userData) ?? userId;
    if (!currentUserId) {
      Alert.alert(
        "Error",
        "No se pudo identificar al usuario para esta acción.",
      );
      return;
    }

    try {
      const response = await fetch(buildEndpointUrl("/inquilino/favoritos"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_inquilino: currentUserId,
          id_propiedad: propiedadId,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Ocurrió un error en el servidor.");
      }

      const targetIdStr = String(propiedadId);
      setFavoritos((prevFavoritos) =>
        prevFavoritos.filter((fav) => {
          const favPropId =
            fav.propiedad?.id_propiedad ??
            fav.id_propiedad ??
            fav.propiedad?.id ??
            fav.id;
          return String(favPropId ?? "") !== targetIdStr;
        }),
      );
      Alert.alert("Éxito", "Propiedad eliminada de tus favoritos.");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo eliminar de favoritos. Intenta de nuevo.";
      Alert.alert("Error", message);
    }
  };

  if (!authService.isAuthenticated() || shouldRedirectToLandlord) {
    return null;
  }

  if (!isAuthorizedTenant) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <HeaderInquilino />
        <View className="flex-1 bg-[#FAFAFA] justify-center items-center px-6">
          <View className="w-full max-w-md bg-white border border-[#DCDCDC] rounded-2xl p-6 shadow-sm items-center">
            <AlertCircle size={36} color="#DC2626" />
            <Text className="mt-3 font-poppins font-semibold text-xl text-[#1C1C1C] text-center">
              No se pudo validar tu perfil de huésped
            </Text>
            <Text className="mt-2 font-inter text-sm text-[#595959] text-center leading-5">
              Tu sesión actual no incluye un identificador completo de inquilino.
              Vuelve a iniciar sesión para continuar.
            </Text>
            <TouchableOpacity
              onPress={() => {
                authService.logout();
                router.replace("/loginPage" as any);
              }}
              className="mt-5 min-h-[48px] justify-center w-full bg-[#B8860B] rounded-xl py-3 items-center"
            >
              <Text className="font-inter-medium text-white">
                Volver a iniciar sesión
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <BottomTabBar />
      </SafeAreaView>
    );
  }

  if (isLoading && !userData?.nombre && !userData?.correo) {
    return (
      <SafeAreaView
        className="flex-1 bg-[#FAFAFA]"
        edges={["top", "left", "right"]}
      >
        <StatusBar style="dark" />
        <HeaderInquilino />
        <View className="flex-1 bg-[#FAFAFA] justify-center items-center">
          <ActivityIndicator size="large" color="#B8860B" />
          <Text className="mt-4 font-inter-medium text-[#1C1C1C]">
            Cargando perfil...
          </Text>
        </View>
        <BottomTabBar />
      </SafeAreaView>
    );
  }

  const getInitials = (name?: string) => {
    if (!name) return "US";
    const names = name.trim().split(/\s+/);
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const userRole = "Huésped";

  const formatPrice = (price?: number | string) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(Number(price) || 0);
  };

  const getText = (value?: unknown) =>
    typeof value === "string" ? value.trim() : "";

  const getTitleFromDescription = (description?: string) =>
    getText(description)
      .split("\n")
      .map((part) => part.trim())
      .find(Boolean) || "";

  const getFavoriteTitle = (favorite: Record<string, any>) =>
    favorite.propiedad?.titulo ||
    getTitleFromDescription(favorite.propiedad?.descripcion) ||
    `Propiedad ${favorite.propiedad?.id_propiedad || ""}`.trim();

  const getFavoriteLocation = (favorite: Record<string, any>) =>
    favorite.propiedad?.ubicacion ||
    favorite.propiedad?.ciudad ||
    favorite.propiedad?.direccion ||
    "Ubicación no especificada";

  const getBookingTitle = (booking: Record<string, any>) =>
    booking.titulo ||
    booking.propiedad?.titulo ||
    booking.nombre_propiedad ||
    getTitleFromDescription(booking.propiedad?.descripcion) ||
    `Propiedad ${booking.id_propiedad || booking.id || ""}`;

  const getBookingLocation = (booking: Record<string, any>) =>
    booking.ubicacion ||
    booking.propiedad?.ubicacion ||
    booking.propiedad?.ciudad ||
    "Ubicación oculta";

  const getBookingStartDate = (booking: Record<string, any>) =>
    booking.fecha_entrada || booking.fecha_inicio;
  const getBookingEndDate = (booking: Record<string, any>) =>
    booking.fecha_salida || booking.fecha_fin;
  const getBookingTotal = (booking: Record<string, any>) =>
    booking.total_pagado ??
    booking.precio_total ??
    booking.total ??
    booking.pago ??
    0;
  const getBookingStatus = (booking: Record<string, any>) =>
    booking.estado_reserva || booking.estado || "Procesando";

  const paidStatuses = [
    "COMPLETADO",
    "COMPLETED",
    "CONFIRMADO",
    "CONFIRMED",
    "PAGADO",
    "PAID",
    "APROBADO",
    "APPROVED",
  ];
  const hasConfirmedPayment = (booking: Record<string, any>) => {
    const targetId =
      booking?.id_reserva ?? booking?.id_navegacion ?? booking?.id;
    if (
      targetId &&
      authService.getStorageItem(
        `nowayhome_paid_reserva_${String(targetId).trim()}`,
      )
    ) {
      return true;
    }
    const payments = Array.isArray(booking?.pagos) ? booking.pagos : [];
    const directStatus = String(
      booking?.estado_pago ||
        booking?.estadoPago ||
        booking?.pago_estado ||
        booking?.payment_status ||
        booking?.pago?.estado_pago ||
        "",
    ).toUpperCase();
    return (
      Boolean(booking?.id_transaccion_paypal) ||
      booking?.pagado === true ||
      paidStatuses.includes(directStatus) ||
      payments.some(
        (payment: Record<string, any>) =>
          Boolean(payment?.id_transaccion_paypal) ||
          paidStatuses.includes(
            String(
              payment?.estado_pago || payment?.estado || payment?.status || "",
            ).toUpperCase(),
          ),
      )
    );
  };

  const handleCancelBooking = async (cancellationReason: string) => {
    const tenantId = getTenantId(userData) ?? userId;
    if (!bookingToCancel?.id_reserva || !tenantId) return;

    setIsCancelling(true);
    setCancellationError("");
    try {
      const updatedBooking = await tenantBookingService.cancelarReserva({
        idReserva: bookingToCancel.id_reserva,
        idInquilino: tenantId,
        motivoCancelacion: cancellationReason,
      });
      setReservas((current) =>
        current.map((booking) =>
          booking.id_reserva ===
          (updatedBooking?.id_reserva ?? bookingToCancel.id_reserva)
            ? {
                ...booking,
                ...updatedBooking,
                estado: updatedBooking?.estado || "cancelada",
                estado_reserva: updatedBooking?.estado || "cancelada",
              }
            : booking,
        ),
      );

      const isPaid = hasConfirmedPayment(bookingToCancel);
      notificarReservaCanceladaPorInquilino({
        idReserva: bookingToCancel.id_reserva,
        idInquilino: tenantId,
        tituloPropiedad: extraerTituloPropiedadDeReserva(bookingToCancel),
        isPaid,
        redirectScreen: "/inquilino/profileInquilino",
      });
      Alert.alert(
        "Reserva cancelada correctamente",
        isPaid
          ? "La reserva fue cancelada. Si existía un pago asociado, el reembolso se gestionará en una fase posterior."
          : "Tu reserva ha sido cancelada correctamente.",
      );
      setBookingToCancel(null);
    } catch {
      setCancellationError(
        "No se pudo cancelar la reserva. Intenta nuevamente.",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <HeaderInquilino />

      <ScrollView
        className="flex-1 bg-[#FAFAFA] py-6 px-4"
        showsVerticalScrollIndicator={false}
      >
        {loadError ? (
          <View className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <Text className="font-poppins text-amber-900 font-semibold mb-1">
              Perfil cargado parcialmente
            </Text>
            <Text className="font-inter text-amber-800">{loadError}</Text>
          </View>
        ) : null}

        {/* Profile Header */}
        <View className="p-6 mb-6 bg-white border border-[#DCDCDC] shadow-sm rounded-2xl">
          <View className="flex-col items-center">
            <View className="h-24 w-24 bg-[#B8860B] rounded-full border-4 border-[#F5F2EC] items-center justify-center mb-4">
              <Text className="text-white text-2xl font-poppins font-semibold">
                {getInitials(userData.nombre)}
              </Text>
            </View>

            <View className="w-full items-center mb-5">
              <View className="flex-col items-center mb-4">
                <Text className="font-poppins font-semibold text-2xl text-[#1C1C1C] capitalize text-center mb-1.5">
                  {userData.nombre || "Usuario"}
                </Text>
                <View className="flex-row items-center gap-1.5 bg-[#F5F2EC] border border-[#DCDCDC] px-3 py-1 rounded-full">
                  <Star size={16} color="#B8860B" fill="#B8860B" />
                  <Text className="font-inter-medium text-[#1C1C1C] text-sm">
                    Huésped en NoWayHome
                  </Text>
                </View>
              </View>

              <View className="flex-col gap-2.5 w-full items-center">
                <View className="flex-row items-center justify-center gap-2">
                  <Mail size={16} color="#B87333" />
                  <Text className="font-inter text-[#1C1C1C] text-sm">
                    {userData.correo || userData.email || "Sin correo"}
                  </Text>
                </View>
                {userData.telefono ? (
                  <View className="flex-row items-center justify-center gap-2">
                    <Phone size={16} color="#B87333" />
                    <Text className="font-inter text-[#1C1C1C] text-sm">
                      {userData.telefono}
                    </Text>
                  </View>
                ) : null}
                <View className="flex-row items-center justify-center gap-2">
                  <Calendar size={16} color="#B87333" />
                  <Text className="font-inter text-[#595959] text-sm">
                    Miembro verificado
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIsEditOpen(true)}
              className="min-h-[48px] w-full border-[1.5px] border-[#B8860B] rounded-xl flex-row items-center justify-center py-3 px-6 gap-2"
            >
              <Edit size={16} color="#B8860B" />
              <Text className="font-inter-medium text-[#B8860B]">Editar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Tabs Navigation */}
        <View className="flex-row bg-white border border-[#DCDCDC] p-1 rounded-xl mb-6">
          <TouchableOpacity
            onPress={() => setActiveTab("bookings")}
            className={`min-h-[44px] flex-1 py-2.5 rounded-lg items-center justify-center ${
              activeTab === "bookings" ? "bg-[#B8860B]" : "bg-transparent"
            }`}
          >
            <Text
              className={`font-inter-medium text-sm ${
                activeTab === "bookings" ? "text-white" : "text-[#1C1C1C]"
              }`}
            >
              Mis Reservas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("favorites")}
            className={`min-h-[44px] flex-1 py-2.5 rounded-lg items-center justify-center ${
              activeTab === "favorites" ? "bg-[#B8860B]" : "bg-transparent"
            }`}
          >
            <Text
              className={`font-inter-medium text-sm ${
                activeTab === "favorites" ? "text-white" : "text-[#1C1C1C]"
              }`}
            >
              Favoritos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("settings")}
            className={`min-h-[44px] flex-1 py-2.5 rounded-lg items-center justify-center ${
              activeTab === "settings" ? "bg-[#B8860B]" : "bg-transparent"
            }`}
          >
            <Text
              className={`font-inter-medium text-sm ${
                activeTab === "settings" ? "text-white" : "text-[#1C1C1C]"
              }`}
            >
              Configuración
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content: Mis Reservas */}
        {activeTab === "bookings" && (
          <View className="mb-10 flex-col gap-6">
            <View className="flex-col gap-3 mb-2">
              <Text className="font-poppins font-semibold text-2xl text-[#1C1C1C]">
                Próximas Reservas
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/inquilino/ExplorarPage" as any)}
                className="min-h-[48px] justify-center bg-[#B8860B] rounded-xl py-3 px-6 w-full items-center"
              >
                <Text className="font-inter-medium text-white">
                  Nueva Reserva
                </Text>
              </TouchableOpacity>
            </View>

            {reservas.length === 0 ? (
              <View className="py-12 items-center bg-white rounded-2xl border border-[#DCDCDC]">
                <Text className="font-inter text-[#595959] text-center">
                  Aún no tienes reservas realizadas.
                </Text>
              </View>
            ) : (
              <View className="flex-col gap-4">
                {reservas.map((booking, index) => {
                  const estadoCrudo = String(
                    getBookingStatus(booking) || "",
                  ).toLowerCase();
                  let estadoNormalizado = estadoCrudo;
                  if (estadoCrudo === "confirmed")
                    estadoNormalizado = "confirmada";
                  if (estadoCrudo === "pending")
                    estadoNormalizado = "pendiente";
                  if (estadoCrudo === "cancelled" || estadoCrudo === "canceled")
                    estadoNormalizado = "cancelada";
                  if (estadoCrudo === "rejected")
                    estadoNormalizado = "rechazada";

                  const statusColor =
                    estadoNormalizado === "confirmada"
                      ? "text-[#B8860B]"
                      : estadoNormalizado === "cancelada" ||
                          estadoNormalizado === "rechazada"
                        ? "text-[#DC2626]"
                        : "text-[#B87333]";

                  return (
                    <View
                      key={booking.id_reserva || `res-${index}`}
                      className="p-5 bg-white border border-[#DCDCDC] rounded-2xl shadow-sm"
                    >
                      <View className="flex-col gap-4">
                        <View>
                          <Text className="font-poppins font-semibold text-lg text-[#1C1C1C] mb-3">
                            {getBookingTitle(booking)}
                          </Text>
                          <View className="flex-col gap-2">
                            <View className="flex-row items-center gap-2">
                              <MapPin size={16} color="#B87333" />
                              <Text className="font-inter text-[#595959] text-sm">
                                {getBookingLocation(booking)}
                              </Text>
                            </View>
                            <View className="flex-row items-center gap-2">
                              <Calendar size={16} color="#B87333" />
                              <Text
                                className="font-inter text-[#595959] text-sm flex-1"
                                numberOfLines={2}
                              >
                                {formatDateLong(getBookingStartDate(booking))}{" "}
                                al {formatDateLong(getBookingEndDate(booking))}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View className="flex-col items-start gap-3 pt-4 border-t border-[#DCDCDC]">
                          <View className="items-start w-full">
                            <Text className="font-poppins font-semibold text-2xl text-[#B8860B]">
                              {formatPrice(getBookingTotal(booking))}
                            </Text>
                            <Text className="font-inter text-sm text-[#1C1C1C] mt-1">
                              Estado:{" "}
                              <Text
                                className={`font-inter-semibold capitalize ${statusColor}`}
                              >
                                {estadoNormalizado}
                              </Text>
                              {estadoNormalizado === "confirmada" ? (
                                <Text
                                  className={`font-inter-semibold ${
                                    hasConfirmedPayment(booking)
                                      ? "text-[#B8860B]"
                                      : "text-[#B87333]"
                                  }`}
                                >
                                  {hasConfirmedPayment(booking)
                                    ? " • Pagada con PayPal"
                                    : " • Pendiente de pago"}
                                </Text>
                              ) : null}
                            </Text>
                          </View>

                          <View className="flex-row gap-2 w-full mt-2">
                            <TouchableOpacity
                              onPress={() => {
                                const targetId =
                                  booking.id_reserva ||
                                  booking.id_navegacion ||
                                  booking.id;
                                if (targetId) {
                                  router.push({
                                    pathname:
                                      "/inquilino/detallesReservaPage" as any,
                                    params: { idReserva: String(targetId) },
                                  });
                                }
                              }}
                              className={`min-h-[48px] justify-center flex-1 rounded-xl py-2.5 items-center ${
                                estadoNormalizado === "confirmada" &&
                                !hasConfirmedPayment(booking)
                                  ? "bg-[#B8860B]"
                                  : "border-[1.5px] border-[#B8860B]"
                              }`}
                            >
                              <Text
                                className={`font-inter-medium ${
                                  estadoNormalizado === "confirmada" &&
                                  !hasConfirmedPayment(booking)
                                    ? "text-white"
                                    : "text-[#B8860B]"
                                }`}
                              >
                                {estadoNormalizado === "confirmada" &&
                                !hasConfirmedPayment(booking)
                                  ? "Pagar con PayPal"
                                  : "Ver Detalles"}
                              </Text>
                            </TouchableOpacity>

                            {["pendiente", "confirmada"].includes(
                              estadoNormalizado,
                            ) && booking.id_reserva ? (
                              <TouchableOpacity
                                onPress={() => {
                                  setBookingToCancel(booking);
                                  setCancellationError("");
                                }}
                                className="min-h-[48px] justify-center flex-1 bg-[#DC2626] rounded-xl py-2.5 items-center"
                              >
                                <Text className="font-inter-medium text-white">
                                  Cancelar
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Tab Content: Favoritos */}
        {activeTab === "favorites" && (
          <View className="mb-10 flex-col gap-6">
            <View className="flex-row items-center gap-2 mb-2">
              <Heart size={24} color="#B8860B" fill="#B8860B" />
              <Text className="font-poppins font-semibold text-2xl text-[#1C1C1C]">
                Propiedades Favoritas
              </Text>
            </View>

            {favoritos.length === 0 ? (
              <View className="py-12 items-center bg-white rounded-2xl border border-[#DCDCDC]">
                <Text className="font-inter text-[#595959] text-center">
                  Tu lista de favoritos está vacía.
                </Text>
              </View>
            ) : (
              <View className="flex-col gap-4">
                {favoritos.map((favorite, favIndex) => {
                  const propiedadId =
                    favorite.propiedad?.id_propiedad ??
                    favorite.id_propiedad ??
                    favorite.propiedad?.id;

                  return (
                    <View
                      key={
                        favorite.id_favorito || propiedadId || `fav-${favIndex}`
                      }
                      className="p-5 bg-white border border-[#DCDCDC] rounded-2xl shadow-sm"
                    >
                      <View className="flex-col gap-4">
                        <View>
                          <View className="flex-row justify-between items-start gap-4 mb-3">
                            <Text className="font-poppins font-semibold text-lg text-[#1C1C1C] flex-1">
                              {getFavoriteTitle(favorite)}
                            </Text>
                            <TouchableOpacity
                              onPress={() => handleRemoveFavorito(propiedadId)}
                              disabled={!propiedadId}
                              className="h-10 w-10 items-center justify-center rounded-full bg-[#F5F2EC]"
                            >
                              <Heart size={20} color="#B8860B" fill="#B8860B" />
                            </TouchableOpacity>
                          </View>

                          <View className="flex-row items-center gap-2">
                            <MapPin size={16} color="#B87333" />
                            <Text className="font-inter text-[#595959] text-sm flex-1">
                              {getFavoriteLocation(favorite)}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-col items-start gap-3 border-t border-[#DCDCDC] pt-3.5">
                          <View className="flex-row items-baseline">
                            <Text className="font-poppins font-semibold text-2xl text-[#B8860B]">
                              {formatPrice(
                                favorite.propiedad?.precio_por_noche ||
                                  favorite.propiedad?.precio_noche ||
                                  favorite.propiedad?.precio ||
                                  favorite.precio_por_noche ||
                                  favorite.precio_noche ||
                                  favorite.precio,
                              )}
                            </Text>
                            <Text className="font-inter text-sm text-[#595959] ml-1">
                              {favorite.propiedad?.tipo_precio === "mensual" ||
                              favorite.tipo_precio === "mensual"
                                ? "/ mes"
                                : "/ noche"}
                            </Text>
                          </View>

                          <TouchableOpacity
                            onPress={() => {
                              if (propiedadId) {
                                router.push({
                                  pathname:
                                    "/inquilino/detallesPropiedadPage" as any,
                                  params: {
                                    id: String(propiedadId),
                                    from: "perfil",
                                  },
                                });
                              } else {
                                router.push("/inquilino/ExplorarPage" as any);
                              }
                            }}
                            disabled={!propiedadId}
                            className={`min-h-[48px] justify-center w-full border-[1.5px] border-[#B8860B] rounded-xl py-2.5 px-6 items-center mt-1 ${
                              !propiedadId ? "opacity-50" : ""
                            }`}
                          >
                            <Text className="font-inter-medium text-[#B8860B]">
                              Ver Detalles
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Tab Content: Configuración */}
        {activeTab === "settings" && (
          <View className="mb-10 flex-col gap-6">
            <View className="flex-row items-center gap-2 mb-2">
              <Settings size={24} color="#B87333" />
              <Text className="font-poppins font-semibold text-2xl text-[#1C1C1C]">
                Configuración de Cuenta
              </Text>
            </View>

            <View className="p-6 bg-[#F5F2EC] border border-[#DCDCDC] rounded-2xl flex-col gap-4">
              <View>
                <Text className="font-poppins font-semibold text-lg text-[#1C1C1C] mb-2">
                  Rol actual
                </Text>
                <View className="flex-row items-center gap-2">
                  <View className="px-3 py-1 bg-white border border-[#DCDCDC] rounded-lg">
                    <Text className="font-inter-semibold text-[#B8860B] text-sm">
                      {userRole}
                    </Text>
                  </View>
                  <Text className="font-inter text-sm text-[#595959]">
                    Reservar alojamiento
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => router.push("/inquilino/ExplorarPage" as any)}
                className="min-h-[48px] justify-center border-[1.5px] border-[#B8860B] bg-white rounded-xl py-3 px-4 w-full items-center"
              >
                <Text className="font-inter-medium text-[#B8860B]">
                  Explorar alojamientos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setConfirmSwitchHostOpen(true)}
                className="min-h-[48px] flex-row justify-center bg-[#B8860B] rounded-xl py-3 px-4 w-full items-center gap-2"
              >
                <ArrowLeftRight size={17} color="#FFFFFF" />
                <Text className="font-inter-medium text-white">
                  Cambiar a Anfitrión
                </Text>
              </TouchableOpacity>
            </View>

            <View className="p-6 bg-white border border-[#DCDCDC] rounded-2xl shadow-sm flex-col gap-8">
              <View>
                <Text className="font-poppins font-semibold text-lg text-[#1C1C1C] mb-5">
                  Preferencias de Notificaciones
                </Text>
                <View className="flex-col gap-4">
                  <View className="flex-row items-center justify-between py-2 border-b border-[#DCDCDC]">
                    <Text className="font-inter text-[#1C1C1C]">
                      Ofertas especiales
                    </Text>
                    <Switch
                      value={notifPreferences.ofertas}
                      onValueChange={(val) =>
                        setNotifPreferences({
                          ...notifPreferences,
                          ofertas: val,
                        })
                      }
                      trackColor={{ false: "#DCDCDC", true: "#B8860B" }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View className="flex-row items-center justify-between py-2 border-b border-[#DCDCDC]">
                    <Text className="font-inter text-[#1C1C1C]">
                      Recordatorios de reserva
                    </Text>
                    <Switch
                      value={notifPreferences.recordatorios}
                      onValueChange={(val) =>
                        setNotifPreferences({
                          ...notifPreferences,
                          recordatorios: val,
                        })
                      }
                      trackColor={{ false: "#DCDCDC", true: "#B8860B" }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View className="flex-row items-center justify-between py-2">
                    <Text className="font-inter text-[#1C1C1C]">Newsletter</Text>
                    <Switch
                      value={notifPreferences.newsletter}
                      onValueChange={(val) =>
                        setNotifPreferences({
                          ...notifPreferences,
                          newsletter: val,
                        })
                      }
                      trackColor={{ false: "#DCDCDC", true: "#B8860B" }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
              </View>

              <View className="pt-6 border-t border-[#DCDCDC]">
                <Text className="font-poppins font-semibold text-lg text-[#1C1C1C] mb-5">
                  Seguridad
                </Text>
                <TouchableOpacity
                  onPress={() => setIsChangePasswordOpen(true)}
                  className="min-h-[48px] border-[1.5px] border-[#DCDCDC] bg-[#FAFAFA] rounded-xl py-3 px-4 flex-row items-center justify-start w-full gap-3"
                >
                  <Lock size={18} color="#B87333" />
                  <Text className="font-inter-medium text-[#1C1C1C]">
                    Cambiar contraseña
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <BottomTabBar />

      <EditInquilinoModal
        key={isEditOpen ? "edit-open" : "edit-closed"}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        userData={userData}
        onUpdateSuccess={handleUpdateSuccess}
      />
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        userData={userData}
      />
      <CancelBookingModal
        key={
          bookingToCancel
            ? `cancel-${bookingToCancel.id_reserva ?? bookingToCancel.id ?? "open"}`
            : "cancel-closed"
        }
        open={Boolean(bookingToCancel)}
        onClose={() => setBookingToCancel(null)}
        onConfirm={handleCancelBooking}
        isLoading={isCancelling}
        error={cancellationError}
        requireReason={false}
        description="¿Estás seguro de que deseas cancelar esta reserva? Puedes indicar el motivo opcionalmente."
      />
      <ConfirmActionModal
        open={confirmSwitchHostOpen}
        type="confirm"
        title="Cambiar a Anfitrión"
        description="¿Deseas cambiar tu vista activa al modo Anfitrión para gestionar propiedades y reservas?"
        cancelLabel="Cancelar"
        confirmLabel="Sí, cambiar"
        confirmVariant="adminPrimary"
        onCancel={() => setConfirmSwitchHostOpen(false)}
        onConfirm={() => {
          setConfirmSwitchHostOpen(false);
          const res = authService.switchRole("arrendatario");
          if (res?.success) {
            router.replace("/arrendatario/profileArrendatario" as any);
          }
        }}
      />
    </SafeAreaView>
  );
}

export default ProfilePage;
