import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  ArrowLeftRight,
  BadgeDollarSign,
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Edit,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
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
  Image,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE_URL } from "@/config/api";
import { authController } from "../../controllers/authController";
import { authService } from "@/services/authService";
import {
  getLandlordId,
  getStoredSessionUser as getSessionUserFromStorage,
  getTenantId,
  hasValidId,
  pickValidId,
  resolveUserRole,
} from "@/utils/sessionRole";
import { landlordBookingService } from "@/services/landlordBookingService";
import {
  getLandlordProfile,
  updateLandlordProfile,
} from "@/services/landlordProfileService";
import { getLandlordProperties } from "@/services/propertyService";
import { BottomTabBar } from "../../components/BottomTabBar";
import { ConfirmActionModal } from "../../components/ConfirmActionModal";
import { HeaderArrendatario } from "../../components/headerArrendatario";

export interface LandlordProfileData {
  id?: number | string;
  id_arrendatario?: number | string;
  nombre?: string;
  correo?: string;
  email?: string;
  telefono?: string;
  role?: string;
  rol?: string;
  [key: string]: any;
}

export interface LandlordPropertyItem {
  id_propiedad?: number | string;
  id?: number | string;
  titulo?: string;
  ciudad?: string;
  pais?: string;
  estado?: string;
  precio_por_noche?: number | string;
  tipo_precio?: string;
  imagen_principal?: string | null;
  [key: string]: any;
}

interface ReservationStats {
  totalConfirmado: number;
  totalPendiente: number;
  totalNoActivo: number;
  countConfirmada: number;
  countPendiente: number;
  countNoActiva: number;
}

interface ActionMessageState {
  open: boolean;
  type: "success" | "error" | "info" | "";
  title: string;
  description: string;
}

interface EditFormErrors {
  nombre?: string;
  telefono?: string;
  [key: string]: string | undefined;
}

interface PerfilArrendatarioProps {
  userData?: LandlordProfileData | null;
  onUserUpdate?: (updated: LandlordProfileData) => void;
}

function resolvePropertyImageUri(rawImage?: string | null): string | null {
  if (!rawImage || typeof rawImage !== "string") return null;
  const trimmed = rawImage.trim();
  if (!trimmed) return null;
  if (/^(https?:\/\/|data:image\/)/i.test(trimmed)) {
    return trimmed;
  }
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

// Modal de confirmación reutilizado desde ../../components/ConfirmActionModal

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData?: LandlordProfileData | null;
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

    const userId =
      getLandlordId(userData, "arrendatario") ??
      userData?.id_arrendatario ??
      userData?.id ??
      undefined;
    const result = await authController.updatePassword({
      userId,
      role: "arrendatario",
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

function pickNonEmptyText(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return undefined;
}

export function PerfilArrendatario({
  userData,
  onUserUpdate,
}: PerfilArrendatarioProps = {}) {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<LandlordProfileData | null>(
    () =>
      userData ||
      (getSessionUserFromStorage() as LandlordProfileData | null),
  );
  const [sessionRole, setSessionRole] = useState<string | null>(
    () => authService.getSession()?.role ?? null,
  );

  const effectiveUserData = useMemo(() => {
    return userData || sessionUser;
  }, [userData, sessionUser]);

  const effectiveSessionRole = effectiveUserData
    ? (effectiveUserData.role ?? effectiveUserData.rol ?? sessionRole)
    : sessionRole;

  const [fetchedProfile, setFetchedProfile] =
    useState<LandlordProfileData | null>(null);

  const profile = useMemo<LandlordProfileData | null>(() => {
    if (!effectiveUserData && !fetchedProfile) return null;
    return {
      ...(effectiveUserData || {}),
      ...(fetchedProfile || {}),
    };
  }, [effectiveUserData, fetchedProfile]);

  const [activeTab, setActiveTab] = useState<
    "properties" | "activity" | "settings"
  >("properties");
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [confirmSwitchGuestOpen, setConfirmSwitchGuestOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre: effectiveUserData?.nombre || "",
    telefono: effectiveUserData?.telefono || "",
  });
  const [editErrors, setEditErrors] = useState<EditFormErrors>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Preferencias Notificaciones
  const [notifPreferences, setNotifPreferences] = useState({
    ofertas: true,
    recordatorios: true,
    newsletter: false,
  });

  const [actionMessage, setActionMessage] = useState<ActionMessageState>({
    open: false,
    type: "",
    title: "",
    description: "",
  });
  const [recentProperties, setRecentProperties] = useState<
    LandlordPropertyItem[]
  >([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [propertiesError, setPropertiesError] = useState("");
  const [reservationStats, setReservationStats] = useState<ReservationStats>({
    totalConfirmado: 0,
    totalPendiente: 0,
    totalNoActivo: 0,
    countConfirmada: 0,
    countPendiente: 0,
    countNoActiva: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const hasFocusedOnceRef = useRef(false);
  const onUserUpdateRef = useRef(onUserUpdate);

  useEffect(() => {
    onUserUpdateRef.current = onUserUpdate;
  }, [onUserUpdate]);

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
        (getSessionUserFromStorage() as LandlordProfileData | null) ||
          (nextSession?.user as LandlordProfileData | null) ||
          null,
      );
    });
    return unsubscribe;
  }, []);

  const resolvedRole = useMemo(
    () => resolveUserRole(effectiveUserData, effectiveSessionRole),
    [effectiveSessionRole, effectiveUserData],
  );

  const idArrendatario = useMemo(() => {
    return (
      getLandlordId(effectiveUserData, effectiveSessionRole) ??
      getLandlordId(fetchedProfile, effectiveSessionRole)
    );
  }, [effectiveSessionRole, effectiveUserData, fetchedProfile]);

  const tenantId = useMemo(
    () => getTenantId(effectiveUserData, effectiveSessionRole),
    [effectiveSessionRole, effectiveUserData],
  );

  const isLandlordAccount = Boolean(
    resolvedRole === "arrendatario" ||
      hasValidId(effectiveUserData?.id_arrendatario) ||
      hasValidId(fetchedProfile?.id_arrendatario),
  );

  const isAuthorizedLandlord = Boolean(
    effectiveUserData && isLandlordAccount && hasValidId(idArrendatario),
  );

  const shouldRedirectToTenant = Boolean(
    authService.isAuthenticated() &&
      effectiveUserData &&
      resolvedRole === "inquilino" &&
      !isLandlordAccount &&
      hasValidId(tenantId),
  );

  useEffect(() => {
    if (shouldRedirectToTenant) {
      router.replace("/inquilino/profileInquilino" as any);
    }
  }, [router, shouldRedirectToTenant]);

  const showActionMessage = useCallback(
    (
      type: "success" | "error" | "info",
      description: string,
      title?: string,
    ) => {
      setActionMessage({
        open: true,
        type,
        title: title || (type === "success" ? "Acción completada" : "Aviso"),
        description,
      });
    },
    [],
  );

  const syncUserInSession = useCallback(
    (nextProfileData: LandlordProfileData) => {
      const currentSession = authService.getSession();
      if (!currentSession?.isAuthenticated) {
        return;
      }
      const currentUser =
        (currentSession?.user as LandlordProfileData) ||
        (getSessionUserFromStorage() as LandlordProfileData | null) ||
        {};
      const resolvedLandlordId = pickValidId(
        nextProfileData.id_arrendatario,
        nextProfileData.idArrendatario,
        nextProfileData.arrendatario_id,
        nextProfileData.id_arrendador,
        nextProfileData.id,
        currentUser?.id_arrendatario,
        currentUser?.id,
      );
      const resolvedBaseId = pickValidId(
        nextProfileData.id,
        currentUser?.id,
        resolvedLandlordId,
      );
      const nextNombre = pickNonEmptyText(
        nextProfileData.nombre,
        nextProfileData.name,
        currentUser?.nombre,
        currentUser?.name,
      );
      const nextCorreo = pickNonEmptyText(
        nextProfileData.correo,
        nextProfileData.email,
        currentUser?.correo,
        currentUser?.email,
      );

      const mergedUser: LandlordProfileData = {
        ...currentUser,
        ...nextProfileData,
        ...(resolvedBaseId !== null ? { id: resolvedBaseId } : {}),
        ...(resolvedLandlordId !== null
          ? { id_arrendatario: resolvedLandlordId }
          : {}),
        ...(nextNombre ? { nombre: nextNombre } : {}),
        ...(nextCorreo ? { correo: nextCorreo } : {}),
        role: "arrendatario",
        rol: "arrendatario",
      };

      const isSameSessionState =
        JSON.stringify(currentSession.user ?? null) ===
          JSON.stringify(mergedUser) && currentSession.role === "arrendatario";
      if (isSameSessionState) {
        return;
      }

      authService.setStorageItem("user", JSON.stringify(mergedUser));
      authService.setSession({
        ...currentSession,
        user: mergedUser,
        role: "arrendatario",
        token: currentSession?.token || null,
      });
    },
    [],
  );

  useEffect(() => {
    if (!isAuthorizedLandlord || !hasValidId(idArrendatario)) {
      return;
    }

    let isMounted = true;

    async function loadProfile() {
      try {
        const nextProfile = await getLandlordProfile(idArrendatario);
        if (!isMounted || !nextProfile) return;

        setFetchedProfile((currentProfile) => {
          const safeLandlordId = pickValidId(
            nextProfile.id_arrendatario,
            nextProfile.id,
            currentProfile?.id_arrendatario,
            idArrendatario,
          );
          return {
            ...currentProfile,
            ...nextProfile,
            ...(safeLandlordId !== null
              ? { id_arrendatario: safeLandlordId }
              : {}),
          };
        });
        syncUserInSession(nextProfile);
        onUserUpdateRef.current?.(nextProfile);
      } catch (error: unknown) {
        if (!isMounted) return;
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo cargar tu información.";
        showActionMessage("error", message, "Error");
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [
    idArrendatario,
    isAuthorizedLandlord,
    showActionMessage,
    syncUserInSession,
  ]);

  useEffect(() => {
    if (!isAuthorizedLandlord || !hasValidId(idArrendatario)) {
      return;
    }

    let isMounted = true;

    async function loadRecentProperties() {
      try {
        setIsLoadingProperties(true);
        setPropertiesError("");
        const properties = await getLandlordProperties(idArrendatario);
        if (!isMounted) return;
        setRecentProperties(
          Array.isArray(properties) ? properties.slice(0, 3) : [],
        );
      } catch {
        if (!isMounted) return;
        setPropertiesError("No se pudieron cargar tus propiedades.");
      } finally {
        if (isMounted) {
          setIsLoadingProperties(false);
        }
      }
    }

    void loadRecentProperties();

    return () => {
      isMounted = false;
    };
  }, [idArrendatario, isAuthorizedLandlord, refreshTrigger]);

  useEffect(() => {
    if (!isAuthorizedLandlord || !hasValidId(idArrendatario)) {
      return;
    }

    let isMounted = true;

    async function loadReservationStats() {
      if (!hasValidId(idArrendatario)) {
        if (isMounted) {
          setIsLoadingStats(false);
          setStatsError("No se pudo identificar tu cuenta de arrendatario.");
        }
        return;
      }

      try {
        setIsLoadingStats(true);
        setStatsError("");

        const reservas =
          await landlordBookingService.obtenerReservasRecibidas(idArrendatario);

        if (!isMounted) return;

        const nextStats = (Array.isArray(reservas) ? reservas : []).reduce(
          (acc: ReservationStats, reserva: Record<string, any>) => {
            const status = String(reserva.estado || "").toLowerCase();
            const amount = Number(reserva.total ?? reserva.pago ?? 0);
            const safeAmount = Number.isFinite(amount) ? amount : 0;

            if (status === "confirmada") {
              acc.totalConfirmado += safeAmount;
              acc.countConfirmada += 1;
              return acc;
            }

            if (status === "pendiente") {
              acc.totalPendiente += safeAmount;
              acc.countPendiente += 1;
              return acc;
            }

            if (status === "cancelada" || status === "rechazada") {
              acc.totalNoActivo += safeAmount;
              acc.countNoActiva += 1;
            }

            return acc;
          },
          {
            totalConfirmado: 0,
            totalPendiente: 0,
            totalNoActivo: 0,
            countConfirmada: 0,
            countPendiente: 0,
            countNoActiva: 0,
          },
        );

        setReservationStats(nextStats);
      } catch {
        if (!isMounted) return;
        setStatsError("No se pudieron cargar los ingresos estimados.");
      } finally {
        if (isMounted) {
          setIsLoadingStats(false);
        }
      }
    }

    void loadReservationStats();

    return () => {
      isMounted = false;
    };
  }, [idArrendatario, isAuthorizedLandlord, refreshTrigger]);

  const getInitials = (name?: string) => {
    if (!name) return "US";
    const names = name.trim().split(/\s+/);
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const openEditProfile = () => {
    setEditForm({
      nombre: profile?.nombre || "",
      telefono: profile?.telefono || "",
    });
    setEditErrors({});
    setIsEditOpen(true);
  };

  const closeEditProfile = () => {
    if (isSavingProfile) return;
    setIsEditOpen(false);
    setEditErrors({});
  };

  const handleEditFieldChange = (name: "nombre" | "telefono", value: string) => {
    setEditForm((current) => ({ ...current, [name]: value }));
    setEditErrors((current) => ({ ...current, [name]: "" }));
  };

  const validateEditForm = (): EditFormErrors => {
    const nextErrors: EditFormErrors = {};
    const telefono = editForm.telefono.trim().replace(/\D/g, "");

    if (!editForm.nombre.trim()) {
      nextErrors.nombre = "El nombre es obligatorio.";
    }

    if (
      editForm.telefono.trim() &&
      (telefono.length < 7 || telefono.length > 20)
    ) {
      nextErrors.telefono = "Ingresa un teléfono válido.";
    }

    return nextErrors;
  };

  const handleSaveProfile = async () => {
    const nextErrors = validateEditForm();
    setEditErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) return;

    if (!hasValidId(idArrendatario)) {
      showActionMessage(
        "error",
        "No se pudo identificar tu cuenta de arrendatario.",
        "Error",
      );
      return;
    }

    try {
      setIsSavingProfile(true);
      const updatedProfile = await updateLandlordProfile(idArrendatario, {
        nombre: editForm.nombre.trim(),
        telefono: editForm.telefono.trim(),
      });
      const mergedProfile = {
        ...profile,
        ...updatedProfile,
      };
      setFetchedProfile(mergedProfile);
      syncUserInSession(mergedProfile);
      onUserUpdateRef.current?.(mergedProfile);
      setIsEditOpen(false);
      showActionMessage(
        "success",
        "Información actualizada correctamente.",
        "Acción completada",
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar tu información. Intenta nuevamente.";
      showActionMessage("error", message, "Error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const formatPrice = (property: LandlordPropertyItem) => {
    const price = Number(property.precio_por_noche || 0).toLocaleString(
      "es-MX",
      {
        maximumFractionDigits: 2,
      },
    );
    return property.tipo_precio === "mensual"
      ? `$${price} mensual`
      : `$${price} por noche`;
  };

  const getStatusBgColor = (estado?: string) => {
    if (estado === "activa") return "bg-[#B8860B]";
    if (estado === "suspendida") return "bg-amber-100";
    return "bg-[#DCDCDC]";
  };

  const getStatusTextColor = (estado?: string) => {
    if (estado === "activa") return "text-white";
    if (estado === "suspendida") return "text-amber-800";
    return "text-[#1C1C1C]";
  };

  const formatCurrency = (value?: number | string) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  };

  const renderEditError = (field: keyof EditFormErrors) => {
    if (!editErrors[field]) return null;
    return (
      <Text className="mt-1 text-sm text-red-700">{editErrors[field]}</Text>
    );
  };

  if (!authService.isAuthenticated() || shouldRedirectToTenant) {
    return null;
  }

  if (!isAuthorizedLandlord) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <HeaderArrendatario />
        <View className="flex-1 bg-[#FAFAFA] justify-center items-center px-6">
          <View className="w-full max-w-md bg-white border border-[#DCDCDC] rounded-2xl p-6 shadow-sm items-center">
            <AlertCircle size={36} color="#DC2626" />
            <Text className="mt-3 font-poppins font-semibold text-xl text-[#1C1C1C] text-center">
              No se pudo validar tu perfil de anfitrión
            </Text>
            <Text className="mt-2 font-inter text-sm text-[#595959] text-center leading-5">
              Tu sesión de arrendatario no incluye un identificador completo.
              Vuelve a iniciar sesión para cargar tu perfil y tus propiedades.
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

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <HeaderArrendatario />

      <ScrollView
        className="flex-1 bg-[#FAFAFA] py-6 px-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View className="p-6 mb-6 bg-white border border-[#DCDCDC] shadow-sm rounded-2xl">
          <View className="flex-col items-center">
            <View className="h-24 w-24 bg-[#B8860B] rounded-full border-4 border-[#F5F2EC] items-center justify-center mb-4">
              <Text className="text-white text-2xl font-poppins font-semibold">
                {getInitials(profile?.nombre)}
              </Text>
            </View>

            <View className="w-full items-center mb-5">
              <View className="flex-col items-center mb-4">
                <Text className="font-poppins font-semibold text-2xl text-[#1C1C1C] capitalize text-center mb-1.5">
                  {profile?.nombre || "Usuario"}
                </Text>
                <View className="flex-row items-center gap-1.5 bg-[#F5F2EC] border border-[#DCDCDC] px-3 py-1 rounded-full">
                  <Star size={16} color="#B8860B" fill="#B8860B" />
                  <Text className="font-inter-medium text-[#1C1C1C] text-sm">
                    Arrendatario en NoWayHome
                  </Text>
                </View>
              </View>

              <View className="flex-col gap-2.5 w-full items-center">
                <View className="flex-row items-center justify-center gap-2">
                  <Mail size={16} color="#B87333" />
                  <Text className="font-inter text-[#1C1C1C] text-sm">
                    {profile?.correo || profile?.email || "Sin correo"}
                  </Text>
                </View>
                {profile?.telefono ? (
                  <View className="flex-row items-center justify-center gap-2">
                    <Phone size={16} color="#B87333" />
                    <Text className="font-inter text-[#1C1C1C] text-sm">
                      {profile.telefono}
                    </Text>
                  </View>
                ) : null}
                <View className="flex-row items-center justify-center gap-2">
                  <MapPin size={16} color="#B87333" />
                  <Text className="font-inter text-[#595959] text-sm">
                    Ubicación no definida
                  </Text>
                </View>
                <View className="flex-row items-center justify-center gap-2">
                  <Calendar size={16} color="#B87333" />
                  <Text className="font-inter text-[#595959] text-sm">
                    Miembro verificado
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={openEditProfile}
              className="min-h-[48px] w-full border-[1.5px] border-[#B8860B] rounded-xl flex-row items-center justify-center py-3 px-6 gap-2"
            >
              <Edit size={16} color="#B8860B" />
              <Text className="font-inter-medium text-[#B8860B]">Editar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Tabs */}
        <View className="flex-row bg-white border border-[#DCDCDC] p-1 rounded-xl mb-6">
          <TouchableOpacity
            onPress={() => setActiveTab("properties")}
            className={`min-h-[44px] flex-1 py-2.5 rounded-lg items-center justify-center ${
              activeTab === "properties" ? "bg-[#B8860B]" : "bg-transparent"
            }`}
          >
            <Text
              className={`font-inter-medium text-sm ${
                activeTab === "properties" ? "text-white" : "text-[#1C1C1C]"
              }`}
            >
              Mis propiedades
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("activity")}
            className={`min-h-[44px] flex-1 py-2.5 rounded-lg items-center justify-center ${
              activeTab === "activity" ? "bg-[#B8860B]" : "bg-transparent"
            }`}
          >
            <Text
              className={`font-inter-medium text-sm ${
                activeTab === "activity" ? "text-white" : "text-[#1C1C1C]"
              }`}
            >
              Actividad
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
              Ajustes
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab: Mis Propiedades */}
        {activeTab === "properties" && (
          <View className="p-6 bg-[#F5F2EC] border border-[#DCDCDC] rounded-2xl mb-10">
            <View className="flex-col gap-6">
              <View className="flex-col gap-4">
                <View>
                  <View className="flex-row items-center gap-2 mb-2">
                    <Building2 size={24} color="#B8860B" />
                    <Text className="font-poppins font-semibold text-2xl text-[#1C1C1C]">
                      Mis propiedades
                    </Text>
                  </View>
                  <Text className="font-inter text-[#595959]">
                    Administra los alojamientos que tienes publicados en
                    NoWayHome.
                  </Text>
                </View>

                <View className="flex-col gap-3">
                  <TouchableOpacity
                    onPress={() =>
                      router.push("/arrendatario/MisPropiedades" as any)
                    }
                    className="min-h-[48px] justify-center border-[1.5px] border-[#B8860B] bg-white rounded-xl py-3 items-center"
                  >
                    <Text className="font-inter-medium text-[#B8860B]">
                      Ver todas mis propiedades
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      router.push("/arrendatario/crearPropiedad" as any)
                    }
                    className="min-h-[48px] bg-[#B8860B] rounded-xl py-3 flex-row items-center justify-center gap-2"
                  >
                    <Plus size={16} color="white" />
                    <Text className="font-inter-medium text-white">
                      Agregar propiedad
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {isLoadingProperties && (
                <Text className="font-inter text-sm text-[#595959]">
                  Cargando propiedades...
                </Text>
              )}

              {!isLoadingProperties && propertiesError ? (
                <Text className="font-inter text-sm text-red-800">
                  {propertiesError}
                </Text>
              ) : null}

              {!isLoadingProperties &&
                !propertiesError &&
                recentProperties.length === 0 && (
                  <View className="rounded-2xl bg-white p-5 border border-[#DCDCDC] items-center">
                    <Text className="mb-4 font-inter text-[#595959] text-center">
                      Aún no tienes propiedades registradas.
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        router.push("/arrendatario/crearPropiedad" as any)
                      }
                      className="min-h-[48px] bg-[#B8860B] rounded-xl py-3 px-6 flex-row items-center gap-2"
                    >
                      <Plus size={16} color="white" />
                      <Text className="font-inter-medium text-white">
                        Agregar propiedad
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

              {!isLoadingProperties &&
                !propertiesError &&
                recentProperties.length > 0 && (
                  <View className="flex-col gap-4">
                    {recentProperties.map((property, index) => {
                      const imageUri = resolvePropertyImageUri(
                        property.imagen_principal,
                      );
                      const propId = property.id_propiedad ?? property.id;
                      const propKey = String(propId ?? `prop-${index}`);

                      return (
                        <TouchableOpacity
                          key={propKey}
                          activeOpacity={0.85}
                          onPress={() => {
                            if (propId !== undefined && propId !== null) {
                              router.push({
                                pathname: "/arrendatario/EditarPropiedad",
                                params: { id: String(propId) },
                              } as any);
                            } else {
                              router.push(
                                "/arrendatario/MisPropiedades" as any,
                              );
                            }
                          }}
                          className="overflow-hidden bg-white border border-[#DCDCDC] rounded-2xl"
                        >
                          {imageUri ? (
                            <Image
                              source={{ uri: imageUri }}
                              className="h-32 w-full bg-[#DCDCDC]"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="h-32 w-full items-center justify-center bg-[#FAFAFA]">
                              <Building2 size={32} color="#B87333" />
                            </View>
                          )}

                          <View className="p-4">
                            <View className="mb-3 flex-row items-start justify-between">
                              <View className="flex-1 pr-2">
                                <Text
                                  className="font-poppins font-semibold text-[#1C1C1C]"
                                  numberOfLines={1}
                                >
                                  {property.titulo}
                                </Text>
                                <Text className="mt-1 font-inter text-xs text-[#595959]">
                                  {[property.ciudad, property.pais]
                                    .filter(Boolean)
                                    .join(", ")}
                                </Text>
                              </View>
                              <View
                                className={`rounded-lg px-2.5 py-1 ${getStatusBgColor(
                                  property.estado,
                                )}`}
                              >
                                <Text
                                  className={`font-inter-medium text-[11px] capitalize ${getStatusTextColor(
                                    property.estado,
                                  )}`}
                                >
                                  {property.estado}
                                </Text>
                              </View>
                            </View>
                            <View className="flex-row items-center justify-between">
                              <Text className="font-poppins text-sm font-semibold text-[#B8860B]">
                                {formatPrice(property)}
                              </Text>
                              <View className="flex-row items-center gap-1">
                                <Edit size={14} color="#B8860B" />
                                <Text className="font-inter-medium text-xs text-[#B8860B]">
                                  Editar
                                </Text>
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
            </View>
          </View>
        )}

        {/* Tab: Actividad */}
        {activeTab === "activity" && (
          <View className="mb-10 flex-col gap-6">
            <View className="flex-row items-center gap-2 mb-2">
              <CalendarCheck size={24} color="#B87333" />
              <Text className="font-poppins font-semibold text-2xl text-[#1C1C1C]">
                Actividad de arrendatario
              </Text>
            </View>

            <View className="p-6 bg-white border border-[#DCDCDC] shadow-sm rounded-2xl">
              <View className="flex-row justify-between items-start mb-4">
                <Text className="font-poppins font-semibold text-[#1C1C1C]">
                  Reservas recibidas
                </Text>
                <CalendarCheck size={20} color="#B87333" />
              </View>
              <Text className="font-inter text-sm text-[#595959] mb-5">
                Aquí podrás revisar solicitudes y reservas asociadas a tus
                alojamientos.
              </Text>
              <TouchableOpacity
                onPress={() =>
                  router.push("/arrendatario/ReservasArrendatario" as any)
                }
                className="min-h-[48px] justify-center border-[1.5px] border-[#B8860B] rounded-xl py-3 items-center"
              >
                <Text className="font-inter-medium text-[#B8860B]">
                  Ver reservas
                </Text>
              </TouchableOpacity>
            </View>

            <View className="p-6 bg-white border border-[#DCDCDC] shadow-sm rounded-2xl">
              <View className="flex-row justify-between items-start mb-4">
                <Text className="font-poppins font-semibold text-[#1C1C1C]">
                  Ingresos / transacciones
                </Text>
                <BadgeDollarSign size={20} color="#B8860B" />
              </View>

              {isLoadingStats && (
                <Text className="font-inter text-sm text-[#595959] mb-5">
                  Calculando ingresos estimados...
                </Text>
              )}

              {!isLoadingStats && statsError ? (
                <Text className="font-inter text-sm text-red-800 mb-5">
                  {statsError}
                </Text>
              ) : null}

              {!isLoadingStats && !statsError && (
                <View className="flex-col gap-3">
                  <View className="flex-row items-center justify-between rounded-xl bg-[#F5F2EC] border border-[#DCDCDC] px-3 py-3">
                    <Text className="font-inter text-[#1C1C1C] text-sm">
                      Total estimado confirmado
                    </Text>
                    <Text className="font-inter-semibold text-[#B8860B] text-sm">
                      {formatCurrency(reservationStats.totalConfirmado)}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-3 py-3">
                    <Text className="font-inter text-[#1C1C1C] text-sm">
                      Total pendiente
                    </Text>
                    <Text className="font-inter-semibold text-[#B87333] text-sm">
                      {formatCurrency(reservationStats.totalPendiente)}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between rounded-xl bg-[#FAFAFA] px-3 py-3 border border-[#DCDCDC]">
                    <Text className="font-inter text-[#595959] text-sm">
                      Total cancelado/rechazado
                    </Text>
                    <Text className="font-inter-semibold text-[#1C1C1C] text-sm">
                      {formatCurrency(reservationStats.totalNoActivo)}
                    </Text>
                  </View>

                  <View className="flex-row gap-2 mt-2">
                    <View className="flex-1 rounded-xl bg-[#F5F2EC] border border-[#DCDCDC] px-2 py-3 items-center">
                      <Text className="font-inter-medium text-center text-[#1C1C1C] text-xs">
                        {reservationStats.countConfirmada} confirmadas
                      </Text>
                    </View>
                    <View className="flex-1 rounded-xl bg-[#F5F2EC] border border-[#DCDCDC] px-2 py-3 items-center">
                      <Text className="font-inter-medium text-center text-[#1C1C1C] text-xs">
                        {reservationStats.countPendiente} pendientes
                      </Text>
                    </View>
                    <View className="flex-1 rounded-xl bg-[#F5F2EC] border border-[#DCDCDC] px-2 py-3 items-center">
                      <Text className="font-inter-medium text-center text-[#1C1C1C] text-xs">
                        {reservationStats.countNoActiva} cancel
                      </Text>
                    </View>
                  </View>

                  <Text className="pt-2 font-inter text-xs text-[#595959]">
                    Estos montos se calculan con base en las reservas
                    registradas y los pagos procesados a través de PayPal.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Tab: Settings */}
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
                  <View className="px-3 py-1 rounded-lg bg-white border border-[#DCDCDC]">
                    <Text className="font-inter-semibold text-[#B8860B] text-sm">
                      Arrendatario
                    </Text>
                  </View>
                  <Text className="font-inter text-sm text-[#595959] flex-shrink">
                    Publicar y gestionar alojamientos
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setConfirmSwitchGuestOpen(true)}
                className="min-h-[48px] flex-row justify-center bg-[#B8860B] rounded-xl py-3 px-4 w-full items-center gap-2"
              >
                <ArrowLeftRight size={17} color="#FFFFFF" />
                <Text className="font-inter-medium text-white">
                  Cambiar a Huésped
                </Text>
              </TouchableOpacity>
            </View>

            <View className="p-6 bg-white border border-[#DCDCDC] shadow-sm rounded-2xl flex-col gap-8">
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
                  className="min-h-[48px] border-[1.5px] border-[#DCDCDC] bg-[#FAFAFA] rounded-xl py-3 px-4 flex-row items-center gap-3"
                >
                  <Lock size={16} color="#B87333" />
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

      {/* Modal para Editar Perfil */}
      <Modal
        visible={isEditOpen}
        transparent
        animationType="fade"
        onRequestClose={closeEditProfile}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="w-full max-w-lg bg-white border border-[#DCDCDC] rounded-2xl p-6 shadow-xl">
            <View className="mb-5">
              <Text className="font-poppins text-xl font-semibold text-[#1C1C1C]">
                Editar información personal
              </Text>
              <Text className="mt-2 font-inter text-sm text-[#595959]">
                Actualiza los datos visibles en tu perfil de arrendatario.
              </Text>
            </View>

            <View className="flex-col gap-4">
              <View>
                <Text className="font-inter-medium text-[#1C1C1C] mb-2">
                  Nombre
                </Text>
                <TextInput
                  value={editForm.nombre}
                  onChangeText={(text) => handleEditFieldChange("nombre", text)}
                  className="h-12 px-4 rounded-xl border border-[#DCDCDC] focus:border-[#B8860B] font-inter-medium text-[#1C1C1C] bg-[#FAFAFA]"
                  placeholderTextColor="#7A7A7A"
                />
                {renderEditError("nombre")}
              </View>

              <View>
                <Text className="font-inter-medium text-[#1C1C1C] mb-2">
                  Teléfono
                </Text>
                <TextInput
                  value={editForm.telefono}
                  onChangeText={(text) =>
                    handleEditFieldChange("telefono", text)
                  }
                  keyboardType="phone-pad"
                  className="h-12 px-4 rounded-xl border border-[#DCDCDC] focus:border-[#B8860B] font-inter-medium text-[#1C1C1C] bg-[#FAFAFA]"
                  placeholderTextColor="#7A7A7A"
                />
                {renderEditError("telefono")}
              </View>

              <View>
                <Text className="font-inter-medium text-[#1C1C1C] mb-2">
                  Correo
                </Text>
                <TextInput
                  value={profile?.correo || profile?.email || ""}
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
                  onPress={handleSaveProfile}
                  disabled={isSavingProfile}
                  className={`min-h-[48px] bg-[#B8860B] rounded-xl py-3 items-center justify-center flex-row ${
                    isSavingProfile ? "opacity-60" : ""
                  }`}
                >
                  {isSavingProfile && (
                    <ActivityIndicator
                      size="small"
                      color="#fff"
                      className="mr-2"
                    />
                  )}
                  <Text className="font-inter-medium text-white">
                    {isSavingProfile ? "Guardando..." : "Guardar cambios"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={closeEditProfile}
                  disabled={isSavingProfile}
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

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        userData={profile}
      />

      <ConfirmActionModal
        open={actionMessage.open}
        type={actionMessage.type}
        title={actionMessage.title}
        description={actionMessage.description}
        confirmLabel="Entendido"
        onConfirm={() =>
          setActionMessage({
            open: false,
            type: "",
            title: "",
            description: "",
          })
        }
      />

      <ConfirmActionModal
        open={confirmSwitchGuestOpen}
        type="confirm"
        title="Cambiar a Huésped"
        description="¿Deseas cambiar tu vista activa al modo Huésped para explorar alojamientos y revisar tus reservas?"
        cancelLabel="Cancelar"
        confirmLabel="Sí, cambiar"
        confirmVariant="adminPrimary"
        onCancel={() => setConfirmSwitchGuestOpen(false)}
        onConfirm={() => {
          setConfirmSwitchGuestOpen(false);
          const res = authService.switchRole("inquilino");
          if (res?.success) {
            router.replace("/inquilino/ExplorarPage" as any);
          }
        }}
      />
    </SafeAreaView>
  );
}

export default PerfilArrendatario;
