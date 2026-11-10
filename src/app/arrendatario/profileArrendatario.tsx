import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
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
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { landlordBookingService } from "@/services/landlordBookingService";
import {
  getLandlordProfile,
  updateLandlordProfile,
} from "@/services/landlordProfileService";
import { getLandlordProperties } from "@/services/propertyService";
import { HeaderArrendatario } from "./components/headerArrendatario";

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

function getStoredSessionUser(): LandlordProfileData | null {
  const session = authService.getSession();
  if (session?.user && typeof session.user === "object") {
    return session.user as LandlordProfileData;
  }
  const rawStoredUser = authService.getStorageItem("user");
  if (rawStoredUser) {
    try {
      return JSON.parse(rawStoredUser) as LandlordProfileData;
    } catch {
      return null;
    }
  }
  return null;
}

interface ConfirmActionModalProps {
  open: boolean;
  type: string;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

function ConfirmActionModal({
  open,
  type,
  title,
  description,
  confirmLabel = "Entendido",
  onConfirm,
}: ConfirmActionModalProps) {
  const isSuccess = type === "success";

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onConfirm}
    >
      <View className="flex-1 justify-center items-center bg-black/50 px-4">
        <View className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl">
          <View className="flex-row items-center gap-3 mb-3">
            {isSuccess ? (
              <CheckCircle2 size={24} color="#6B8E23" />
            ) : (
              <AlertCircle size={24} color="#DC2626" />
            )}
            <Text className="font-poppins text-lg font-semibold text-[#5F5F5F] flex-1">
              {title}
            </Text>
          </View>
          <Text className="text-sm text-[#5F5F5F]/80 mb-6 leading-5">
            {description}
          </Text>
          <TouchableOpacity
            onPress={onConfirm}
            className="bg-[#6B8E23] rounded-xl py-3 items-center justify-center"
          >
            <Text className="text-white font-medium">{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

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

    const userId = userData?.id_arrendatario ?? userData?.id;
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
        <View className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-poppins text-xl font-semibold text-[#5F5F5F]">
              Cambiar contraseña
            </Text>
            <TouchableOpacity onPress={handleClose} className="p-1">
              <X size={20} color="#5F5F5F" />
            </TouchableOpacity>
          </View>

          {error || success ? (
            <View
              className={`flex-row items-center p-3 mb-4 rounded-xl border ${
                success
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              {success ? (
                <CheckCircle2 size={18} color="#16A34A" />
              ) : (
                <AlertCircle size={18} color="#DC2626" />
              )}
              <Text
                className={`ml-2 flex-1 text-sm ${
                  success ? "text-green-800" : "text-red-800"
                }`}
              >
                {success || error}
              </Text>
            </View>
          ) : null}

          <View className="flex-col gap-4">
            <View>
              <Text className="text-[#5F5F5F] font-medium mb-2">
                Nueva contraseña
              </Text>
              <View className="relative justify-center">
                <TextInput
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#9ca3af"
                  className="h-12 pl-4 pr-12 rounded-xl border border-[#6B8E23]/20 text-[#5F5F5F] bg-white"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 p-1"
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#5F5F5F88" />
                  ) : (
                    <Eye size={20} color="#5F5F5F88" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text className="text-[#5F5F5F] font-medium mb-2">
                Confirmar nueva contraseña
              </Text>
              <View className="relative justify-center">
                <TextInput
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repite tu nueva contraseña"
                  placeholderTextColor="#9ca3af"
                  className="h-12 pl-4 pr-12 rounded-xl border border-[#6B8E23]/20 text-[#5F5F5F] bg-white"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-4 p-1"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#5F5F5F88" />
                  ) : (
                    <Eye size={20} color="#5F5F5F88" />
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
                className={`bg-[#6B8E23] rounded-xl py-3 items-center justify-center flex-row ${
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
                <Text className="text-white font-medium">
                  {isSubmitting ? "Actualizando..." : "Guardar contraseña"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleClose}
                disabled={isSubmitting}
                className="border-2 border-[#6B8E23] rounded-xl py-3 items-center"
              >
                <Text className="text-[#6B8E23] font-medium">Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function PerfilArrendatario({
  userData,
  onUserUpdate,
}: PerfilArrendatarioProps = {}) {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<LandlordProfileData | null>(
    () => userData || getStoredSessionUser(),
  );

  const effectiveUserData = useMemo(() => {
    return userData || sessionUser;
  }, [userData, sessionUser]);

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

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextSession) => {
      if (!nextSession?.isAuthenticated) {
        setSessionUser(null);
        setFetchedProfile(null);
        router.replace("/" as any);
        return;
      }
      if (nextSession?.user) {
        setSessionUser(nextSession.user as LandlordProfileData);
      }
    });
    return unsubscribe;
  }, [router]);

  const idArrendatario = useMemo(() => {
    return (
      effectiveUserData?.id_arrendatario ??
      effectiveUserData?.id ??
      fetchedProfile?.id_arrendatario ??
      fetchedProfile?.id
    );
  }, [effectiveUserData, fetchedProfile]);

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
        getStoredSessionUser() ||
        {};
      const mergedUser: LandlordProfileData = {
        ...currentUser,
        ...nextProfileData,
        id_arrendatario:
          nextProfileData.id_arrendatario ??
          nextProfileData.id ??
          currentUser?.id_arrendatario ??
          currentUser?.id,
        role: "arrendatario",
      };

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
    if (!idArrendatario) {
      return;
    }

    let isMounted = true;

    async function loadProfile() {
      try {
        const nextProfile = await getLandlordProfile(idArrendatario);
        if (!isMounted || !nextProfile) return;

        setFetchedProfile((currentProfile) => ({
          ...currentProfile,
          ...nextProfile,
        }));
        syncUserInSession(nextProfile);
        onUserUpdate?.(nextProfile);
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
  }, [idArrendatario, onUserUpdate, showActionMessage, syncUserInSession]);

  useEffect(() => {
    let isMounted = true;

    async function loadRecentProperties() {
      if (!idArrendatario) {
        if (isMounted) {
          setIsLoadingProperties(false);
          setPropertiesError(
            "No se pudo identificar tu cuenta de arrendatario.",
          );
        }
        return;
      }

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
  }, [idArrendatario]);

  useEffect(() => {
    let isMounted = true;

    async function loadReservationStats() {
      if (!idArrendatario) {
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
  }, [idArrendatario]);

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

    if (!idArrendatario) {
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
      onUserUpdate?.(mergedProfile);
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
    if (estado === "activa") return "bg-[#6B8E23]";
    if (estado === "suspendida") return "bg-amber-100";
    return "bg-[#A67C52]/20";
  };

  const getStatusTextColor = (estado?: string) => {
    if (estado === "activa") return "text-white";
    if (estado === "suspendida") return "text-amber-800";
    return "text-[#5F5F5F]";
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

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <HeaderArrendatario />

      <ScrollView
        className="flex-1 bg-[#FAFAFA] py-6 px-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View className="p-6 mb-6 bg-white border border-[#6B8E23]/10 shadow-sm rounded-2xl">
          <View className="flex-col items-center">
            <View className="h-24 w-24 bg-[#6B8E23] rounded-full border-4 border-[#F2E8CF] items-center justify-center mb-4">
              <Text className="text-white text-2xl font-poppins font-bold">
                {getInitials(profile?.nombre)}
              </Text>
            </View>

            <View className="w-full items-center mb-5">
              <View className="flex-col items-center mb-4">
                <Text className="font-poppins font-semibold text-2xl text-[#5F5F5F] capitalize text-center mb-1.5">
                  {profile?.nombre || "Usuario"}
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <Star size={16} color="#6B8E23" fill="#6B8E23" />
                  <Text className="text-[#5F5F5F] font-medium text-sm">
                    Arrendatario en NoWayHome
                  </Text>
                </View>
              </View>

              <View className="flex-col gap-2.5 w-full items-center">
                <View className="flex-row items-center justify-center gap-2">
                  <Mail size={16} color="#A67C52" />
                  <Text className="text-[#5F5F5F] text-sm">
                    {profile?.correo || profile?.email || "Sin correo"}
                  </Text>
                </View>
                {profile?.telefono ? (
                  <View className="flex-row items-center justify-center gap-2">
                    <Phone size={16} color="#A67C52" />
                    <Text className="text-[#5F5F5F] text-sm">
                      {profile.telefono}
                    </Text>
                  </View>
                ) : null}
                <View className="flex-row items-center justify-center gap-2">
                  <MapPin size={16} color="#A67C52" />
                  <Text className="text-[#5F5F5F] text-sm">
                    Ubicación no definida
                  </Text>
                </View>
                <View className="flex-row items-center justify-center gap-2">
                  <Calendar size={16} color="#A67C52" />
                  <Text className="text-[#5F5F5F] text-sm">
                    Miembro verificado
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={openEditProfile}
              className="w-full border-2 border-[#6B8E23] rounded-xl flex-row items-center justify-center py-3 px-6 gap-2"
            >
              <Edit size={16} color="#6B8E23" />
              <Text className="text-[#6B8E23] font-medium">Editar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Tabs */}
        <View className="flex-row bg-white border border-[#6B8E23]/10 p-1 rounded-xl mb-6">
          <TouchableOpacity
            onPress={() => setActiveTab("properties")}
            className={`flex-1 py-2.5 rounded-lg items-center justify-center ${
              activeTab === "properties" ? "bg-[#6B8E23]" : "bg-transparent"
            }`}
          >
            <Text
              className={`font-medium text-sm ${
                activeTab === "properties" ? "text-white" : "text-[#5F5F5F]"
              }`}
            >
              Mis propiedades
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("activity")}
            className={`flex-1 py-2.5 rounded-lg items-center justify-center ${
              activeTab === "activity" ? "bg-[#6B8E23]" : "bg-transparent"
            }`}
          >
            <Text
              className={`font-medium text-sm ${
                activeTab === "activity" ? "text-white" : "text-[#5F5F5F]"
              }`}
            >
              Actividad
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("settings")}
            className={`flex-1 py-2.5 rounded-lg items-center justify-center ${
              activeTab === "settings" ? "bg-[#6B8E23]" : "bg-transparent"
            }`}
          >
            <Text
              className={`font-medium text-sm ${
                activeTab === "settings" ? "text-white" : "text-[#5F5F5F]"
              }`}
            >
              Ajustes
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab: Mis Propiedades */}
        {activeTab === "properties" && (
          <View className="p-6 bg-[#F2E8CF] rounded-2xl mb-10">
            <View className="flex-col gap-6">
              <View className="flex-col gap-4">
                <View>
                  <View className="flex-row items-center gap-2 mb-2">
                    <Building2 size={24} color="#6B8E23" />
                    <Text className="font-poppins font-semibold text-2xl text-[#5F5F5F]">
                      Mis propiedades
                    </Text>
                  </View>
                  <Text className="text-[#5F5F5F]">
                    Administra los alojamientos que tienes publicados en
                    NoWayHome.
                  </Text>
                </View>

                <View className="flex-col gap-3">
                  <TouchableOpacity
                    onPress={() =>
                      showActionMessage(
                        "info",
                        "La vista completa de propiedades estará disponible próximamente.",
                        "Mis propiedades",
                      )
                    }
                    className="border-2 border-[#6B8E23] rounded-xl py-3 items-center"
                  >
                    <Text className="text-[#6B8E23] font-medium">
                      Ver todas mis propiedades
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      showActionMessage(
                        "info",
                        "El registro de nuevas propiedades estará disponible próximamente.",
                        "Agregar propiedad",
                      )
                    }
                    className="bg-[#6B8E23] rounded-xl py-3 flex-row items-center justify-center gap-2"
                  >
                    <Plus size={16} color="white" />
                    <Text className="text-white font-medium">
                      Agregar propiedad
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {isLoadingProperties && (
                <Text className="text-sm text-[#5F5F5F]">
                  Cargando propiedades...
                </Text>
              )}

              {!isLoadingProperties && propertiesError ? (
                <Text className="text-sm text-red-800">{propertiesError}</Text>
              ) : null}

              {!isLoadingProperties &&
                !propertiesError &&
                recentProperties.length === 0 && (
                  <View className="rounded-2xl bg-white p-5 border border-[#6B8E23]/10 items-center">
                    <Text className="mb-4 text-[#5F5F5F] text-center">
                      Aún no tienes propiedades registradas.
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        showActionMessage(
                          "info",
                          "El registro de nuevas propiedades estará disponible próximamente.",
                          "Agregar propiedad",
                        )
                      }
                      className="bg-[#6B8E23] rounded-xl py-3 px-6 flex-row items-center gap-2"
                    >
                      <Plus size={16} color="white" />
                      <Text className="text-white font-medium">
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
                      const propKey = String(
                        property.id_propiedad ?? property.id ?? `prop-${index}`,
                      );

                      return (
                        <View
                          key={propKey}
                          className="overflow-hidden bg-white border border-[#6B8E23]/10 rounded-2xl"
                        >
                          {imageUri ? (
                            <Image
                              source={{ uri: imageUri }}
                              className="h-32 w-full bg-gray-200"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="h-32 w-full items-center justify-center bg-[#FAFAFA]">
                              <Building2 size={32} color="#6B8E23" />
                            </View>
                          )}

                          <View className="p-4">
                            <View className="mb-3 flex-row items-start justify-between">
                              <View className="flex-1 pr-2">
                                <Text
                                  className="font-poppins font-semibold text-[#5F5F5F]"
                                  numberOfLines={1}
                                >
                                  {property.titulo}
                                </Text>
                                <Text className="mt-1 text-xs text-[#5F5F5F]/75">
                                  {[property.ciudad, property.pais]
                                    .filter(Boolean)
                                    .join(", ")}
                                </Text>
                              </View>
                              <View
                                className={`rounded-lg px-2 py-1 ${getStatusBgColor(
                                  property.estado,
                                )}`}
                              >
                                <Text
                                  className={`text-[11px] font-medium capitalize ${getStatusTextColor(
                                    property.estado,
                                  )}`}
                                >
                                  {property.estado}
                                </Text>
                              </View>
                            </View>
                            <Text className="font-poppins text-sm font-semibold text-[#6B8E23]">
                              {formatPrice(property)}
                            </Text>
                          </View>
                        </View>
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
              <CalendarCheck size={24} color="#6B8E23" />
              <Text className="font-poppins font-semibold text-2xl text-[#5F5F5F]">
                Actividad de arrendatario
              </Text>
            </View>

            <View className="p-6 bg-white border border-[#6B8E23]/10 shadow-sm rounded-2xl">
              <View className="flex-row justify-between items-start mb-4">
                <Text className="font-poppins font-semibold text-[#5F5F5F]">
                  Reservas recibidas
                </Text>
                <CalendarCheck size={20} color="#6B8E23" />
              </View>
              <Text className="text-sm text-[#5F5F5F] mb-5">
                Aquí podrás revisar solicitudes y reservas asociadas a tus
                alojamientos.
              </Text>
              <TouchableOpacity
                onPress={() =>
                  showActionMessage(
                    "info",
                    "El listado detallado de reservas estará disponible próximamente.",
                    "Reservas recibidas",
                  )
                }
                className="border-2 border-[#6B8E23] rounded-xl py-3 items-center"
              >
                <Text className="text-[#6B8E23] font-medium">Ver reservas</Text>
              </TouchableOpacity>
            </View>

            <View className="p-6 bg-white border border-[#6B8E23]/10 shadow-sm rounded-2xl">
              <View className="flex-row justify-between items-start mb-4">
                <Text className="font-poppins font-semibold text-[#5F5F5F]">
                  Ingresos / transacciones
                </Text>
                <BadgeDollarSign size={20} color="#6B8E23" />
              </View>

              {isLoadingStats && (
                <Text className="text-sm text-[#5F5F5F] mb-5">
                  Calculando ingresos estimados...
                </Text>
              )}

              {!isLoadingStats && statsError ? (
                <Text className="text-sm text-red-800 mb-5">{statsError}</Text>
              ) : null}

              {!isLoadingStats && !statsError && (
                <View className="flex-col gap-3">
                  <View className="flex-row items-center justify-between rounded-xl bg-green-50 px-3 py-3">
                    <Text className="text-[#5F5F5F] text-sm">
                      Total estimado confirmado
                    </Text>
                    <Text className="font-semibold text-green-700 text-sm">
                      {formatCurrency(reservationStats.totalConfirmado)}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between rounded-xl bg-amber-50 px-3 py-3">
                    <Text className="text-[#5F5F5F] text-sm">
                      Total pendiente
                    </Text>
                    <Text className="font-semibold text-amber-700 text-sm">
                      {formatCurrency(reservationStats.totalPendiente)}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between rounded-xl bg-[#FAFAFA] px-3 py-3 border border-gray-100">
                    <Text className="text-[#5F5F5F] text-sm">
                      Total cancelado/rechazado
                    </Text>
                    <Text className="font-semibold text-[#5F5F5F] text-sm">
                      {formatCurrency(reservationStats.totalNoActivo)}
                    </Text>
                  </View>

                  <View className="flex-row gap-2 mt-2">
                    <View className="flex-1 rounded-lg bg-[#F2E8CF] px-2 py-3 items-center">
                      <Text className="text-center text-[#5F5F5F] text-xs">
                        {reservationStats.countConfirmada} confirmadas
                      </Text>
                    </View>
                    <View className="flex-1 rounded-lg bg-[#F2E8CF] px-2 py-3 items-center">
                      <Text className="text-center text-[#5F5F5F] text-xs">
                        {reservationStats.countPendiente} pendientes
                      </Text>
                    </View>
                    <View className="flex-1 rounded-lg bg-[#F2E8CF] px-2 py-3 items-center">
                      <Text className="text-center text-[#5F5F5F] text-xs">
                        {reservationStats.countNoActiva} cancel
                      </Text>
                    </View>
                  </View>

                  <Text className="pt-2 text-xs text-[#5F5F5F]/75">
                    Estos montos son estimados y se calculan con base en las
                    reservas registradas. Los pagos reales se habilitarán más
                    adelante.
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
              <Settings size={24} color="#6B8E23" />
              <Text className="font-poppins font-semibold text-2xl text-[#5F5F5F]">
                Configuración de Cuenta
              </Text>
            </View>

            <View className="p-6 bg-[#F2E8CF] rounded-2xl flex-col gap-4">
              <View>
                <Text className="font-poppins font-semibold text-lg text-[#5F5F5F] mb-2">
                  Rol actual
                </Text>
                <View className="flex-row items-center gap-2">
                  <View className="px-3 py-1 rounded-lg bg-white">
                    <Text className="text-[#6B8E23] font-medium text-sm">
                      Arrendatario
                    </Text>
                  </View>
                  <Text className="text-sm text-[#5F5F5F]/70 flex-shrink">
                    Publicar y gestionar alojamientos
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/" as any)}
                className="border-2 border-[#6B8E23] rounded-xl py-3 items-center w-full"
              >
                <Text className="text-[#6B8E23] font-medium">
                  Ver catálogo como huésped
                </Text>
              </TouchableOpacity>
            </View>

            <View className="p-6 bg-white border border-[#6B8E23]/10 shadow-sm rounded-2xl flex-col gap-8">
              <View>
                <Text className="font-poppins font-semibold text-lg text-[#5F5F5F] mb-5">
                  Preferencias de Notificaciones
                </Text>
                <View className="flex-col gap-4">
                  <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                    <Text className="text-[#5F5F5F]">Ofertas especiales</Text>
                    <Switch
                      value={notifPreferences.ofertas}
                      onValueChange={(val) =>
                        setNotifPreferences({
                          ...notifPreferences,
                          ofertas: val,
                        })
                      }
                      trackColor={{ false: "#d1d5db", true: "#6B8E23" }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                    <Text className="text-[#5F5F5F]">
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
                      trackColor={{ false: "#d1d5db", true: "#6B8E23" }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View className="flex-row items-center justify-between py-2">
                    <Text className="text-[#5F5F5F]">Newsletter</Text>
                    <Switch
                      value={notifPreferences.newsletter}
                      onValueChange={(val) =>
                        setNotifPreferences({
                          ...notifPreferences,
                          newsletter: val,
                        })
                      }
                      trackColor={{ false: "#d1d5db", true: "#6B8E23" }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
              </View>

              <View className="pt-6 border-t border-[#6B8E23]/10">
                <Text className="font-poppins font-semibold text-lg text-[#5F5F5F] mb-5">
                  Seguridad
                </Text>
                <TouchableOpacity
                  onPress={() => setIsChangePasswordOpen(true)}
                  className="border-2 border-[#6B8E23]/20 rounded-xl py-3 px-4 flex-row items-center gap-3"
                >
                  <Lock size={16} color="#5F5F5F" />
                  <Text className="text-[#5F5F5F] font-medium">
                    Cambiar contraseña
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal para Editar Perfil */}
      <Modal
        visible={isEditOpen}
        transparent
        animationType="fade"
        onRequestClose={closeEditProfile}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl">
            <View className="mb-5">
              <Text className="font-poppins text-xl font-semibold text-[#5F5F5F]">
                Editar información personal
              </Text>
              <Text className="mt-2 text-sm text-[#5F5F5F]/75">
                Actualiza los datos visibles en tu perfil de arrendatario.
              </Text>
            </View>

            <View className="flex-col gap-4">
              <View>
                <Text className="text-[#5F5F5F] font-medium mb-2">Nombre</Text>
                <TextInput
                  value={editForm.nombre}
                  onChangeText={(text) => handleEditFieldChange("nombre", text)}
                  className="h-12 px-4 rounded-xl border border-[#6B8E23]/20 text-[#5F5F5F] bg-white"
                  placeholderTextColor="#9ca3af"
                />
                {renderEditError("nombre")}
              </View>

              <View>
                <Text className="text-[#5F5F5F] font-medium mb-2">
                  Teléfono
                </Text>
                <TextInput
                  value={editForm.telefono}
                  onChangeText={(text) =>
                    handleEditFieldChange("telefono", text)
                  }
                  keyboardType="phone-pad"
                  className="h-12 px-4 rounded-xl border border-[#6B8E23]/20 text-[#5F5F5F] bg-white"
                  placeholderTextColor="#9ca3af"
                />
                {renderEditError("telefono")}
              </View>

              <View>
                <Text className="text-[#5F5F5F] font-medium mb-2">Correo</Text>
                <TextInput
                  value={profile?.correo || profile?.email || ""}
                  editable={false}
                  className="h-12 px-4 rounded-xl border border-[#6B8E23]/20 bg-[#FAFAFA] text-[#5F5F5F] opacity-80"
                />
                <Text className="mt-2 text-xs text-[#5F5F5F]/70">
                  El correo se usa para iniciar sesión y no puede modificarse
                  desde esta sección.
                </Text>
              </View>

              <View className="flex-col gap-3 mt-4">
                <TouchableOpacity
                  onPress={handleSaveProfile}
                  disabled={isSavingProfile}
                  className={`bg-[#6B8E23] rounded-xl py-3 items-center justify-center flex-row ${
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
                  <Text className="text-white font-medium">
                    {isSavingProfile ? "Guardando..." : "Guardar cambios"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={closeEditProfile}
                  disabled={isSavingProfile}
                  className="border-2 border-[#6B8E23] rounded-xl py-3 items-center"
                >
                  <Text className="text-[#6B8E23] font-medium">Cancelar</Text>
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
    </SafeAreaView>
  );
}

export default PerfilArrendatario;
