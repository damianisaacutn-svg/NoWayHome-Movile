import { usePathname, useRouter } from "expo-router";
import {
  ArrowLeftRight,
  Bell,
  Building2,
  Calendar,
  Compass,
  Heart,
  Home,
  LogIn,
  LogOut,
  Plus,
  User,
  UserPlus,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { authService } from "@/services/authService";
import { useInAppNotifications } from "@/services/inAppNotificationService";
import {
  getStoredSessionUser,
  resolveUserRole,
  type AppUserRole,
  type SessionUserLike,
} from "@/utils/sessionRole";
import { ConfirmActionModal } from "./ConfirmActionModal";

export interface NavigationDrawerProps {
  visible: boolean;
  onClose: () => void;
}

interface DrawerNavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  badge?: number;
}

export function NavigationDrawer({ visible, onClose }: NavigationDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useInAppNotifications();

  const [sessionState, setSessionState] = useState<{
    isAuthenticated: boolean;
    role: AppUserRole | null;
    user: SessionUserLike | null;
  }>(() => {
    const s = authService.getSession();
    const u = getStoredSessionUser();
    return {
      isAuthenticated: Boolean(s?.isAuthenticated),
      role: resolveUserRole(u, s?.role),
      user: u,
    };
  });

  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [confirmRoleSwitchOpen, setConfirmRoleSwitchOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextSession) => {
      const u =
        (nextSession?.user as SessionUserLike | null) || getStoredSessionUser();
      setSessionState({
        isAuthenticated: Boolean(nextSession?.isAuthenticated),
        role: resolveUserRole(u, nextSession?.role),
        user: u,
      });
    });
    return unsubscribe;
  }, []);

  const { isAuthenticated, role, user } = sessionState;
  const isHost = isAuthenticated && role === "arrendatario";
  const isGuest = isAuthenticated && role !== "arrendatario";

  // Menú adaptado estrictamente a la Fase 5 (sin funciones de Administrador en móvil)
  const items: DrawerNavItem[] = !isAuthenticated
    ? [
        { label: "Inicio", path: "/", icon: Home },
        { label: "Explorar", path: "/?ver=explorar", icon: Compass },
        { label: "Iniciar Sesión", path: "/loginPage", icon: LogIn },
        { label: "Crear Cuenta", path: "/registerPage", icon: UserPlus },
      ]
    : isHost
      ? [
          {
            label: "Mis Propiedades",
            path: "/arrendatario/MisPropiedades",
            icon: Building2,
          },
          {
            label: "Publicar Propiedad",
            path: "/arrendatario/crearPropiedad",
            icon: Plus,
          },
          {
            label: "Reservas",
            path: "/arrendatario/ReservasArrendatario",
            icon: Calendar,
          },
          {
            label: "Notificaciones",
            path: "/notificaciones",
            icon: Bell,
            badge: unreadCount,
          },
          {
            label: "Perfil",
            path: "/arrendatario/profileArrendatario",
            icon: User,
          },
        ]
      : [
          {
            label: "Inicio / Explorar",
            path: "/inquilino/ExplorarPage",
            icon: Compass,
          },
          {
            label: "Favoritos",
            path: "/inquilino/profileInquilino?tab=favorites",
            icon: Heart,
          },
          {
            label: "Mis Reservas",
            path: "/inquilino/profileInquilino?tab=bookings",
            icon: Calendar,
          },
          {
            label: "Notificaciones",
            path: "/notificaciones",
            icon: Bell,
            badge: unreadCount,
          },
          {
            label: "Perfil",
            path: "/inquilino/profileInquilino",
            icon: User,
          },
        ];

  const isPathActive = (targetPath: string) => {
    const cleanCurrent = (pathname || "/").toLowerCase();
    const baseTarget = targetPath.split("?")[0].toLowerCase();
    if (baseTarget === "/" && targetPath.includes("?")) return false;
    return cleanCurrent === baseTarget;
  };

  const navigateTo = (path: string) => {
    onClose();
    router.push(path as any);
  };

  const handleConfirmSwitchRole = () => {
    const targetRole: AppUserRole = isHost ? "inquilino" : "arrendatario";
    const result = authService.switchRole(targetRole);
    setConfirmRoleSwitchOpen(false);
    onClose();
    if (result?.success) {
      router.replace(
        (targetRole === "arrendatario"
          ? "/arrendatario/profileArrendatario"
          : "/inquilino/ExplorarPage") as any,
      );
    }
  };

  const handleConfirmLogout = () => {
    setConfirmLogoutOpen(false);
    onClose();
    authService.logout();
    router.replace("/" as any);
  };

  const userName = String(
    user?.nombre || user?.name || user?.correo || user?.email || "Usuario",
  );
  const userEmail = String(user?.correo || user?.email || "");

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View className="flex-1 flex-row bg-black/45">
          {/* Panel lateral tipo Drawer */}
          <SafeAreaView
            className="w-[82%] max-w-[330px] bg-[#FAFAFA] h-full border-r border-[#DCDCDC]"
            edges={["top", "bottom", "left"]}
          >
            {/* Cabecera del Drawer */}
            <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-[#DCDCDC]">
              <View className="flex-row items-center gap-2.5">
                <View className="h-10 w-10 rounded-xl bg-[#B8860B] items-center justify-center">
                  <Home size={20} color="#FFFFFF" />
                </View>
                <View>
                  <Text className="font-poppins text-lg font-semibold text-[#1C1C1C]">
                    NoWayHome
                  </Text>
                  <Text className="font-inter text-xs text-[#B87333]">
                    {isAuthenticated
                      ? isHost
                        ? "Modo Anfitrión"
                        : "Modo Huésped"
                      : "Explora alojamientos"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
                accessibilityLabel="Cerrar menú"
                className="h-11 w-11 items-center justify-center rounded-xl border border-[#DCDCDC] bg-[#FAFAFA]"
              >
                <X size={20} color="#1C1C1C" />
              </TouchableOpacity>
            </View>

            {/* Tarjeta de usuario autenticado */}
            {isAuthenticated ? (
              <View className="mx-4 mt-4 rounded-2xl bg-white border border-[#DCDCDC] p-4">
                <Text
                  className="font-poppins text-base font-semibold text-[#1C1C1C]"
                  numberOfLines={1}
                >
                  {userName}
                </Text>
                {userEmail ? (
                  <Text
                    className="font-inter text-xs text-[#595959] mt-0.5"
                    numberOfLines={1}
                  >
                    {userEmail}
                  </Text>
                ) : null}
                <View className="mt-2.5 self-start rounded-full bg-[#B8860B]/15 px-3 py-1">
                  <Text className="font-inter-semibold text-xs text-[#B8860B]">
                    {isHost ? "Anfitrión activo" : "Huésped activo"}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Lista de navegación */}
            <ScrollView
              className="flex-1 px-4 pt-4"
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              <Text className="font-inter-medium text-xs uppercase tracking-wider text-[#595959] px-2 mb-2">
                Navegación
              </Text>

              <View className="flex-col gap-2">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isPathActive(item.path);
                  return (
                    <TouchableOpacity
                      key={item.label}
                      onPress={() => navigateTo(item.path)}
                      className={`min-h-[48px] flex-row items-center justify-between rounded-xl px-4 py-3 border ${
                        active
                          ? "bg-[#B8860B]/12 border-[#B8860B]"
                          : "bg-white border-[#DCDCDC]"
                      }`}
                    >
                      <View className="flex-row items-center gap-3 flex-1">
                        <Icon
                          size={20}
                          color={active ? "#B8860B" : "#B87333"}
                        />
                        <Text
                          className={`font-inter-medium text-sm ${
                            active ? "text-[#B8860B]" : "text-[#1C1C1C]"
                          }`}
                        >
                          {item.label}
                        </Text>
                      </View>

                      {item.badge && item.badge > 0 ? (
                        <View className="min-w-[24px] h-6 rounded-full bg-[#B8860B] px-2 items-center justify-center">
                          <Text className="font-inter-semibold text-xs text-white">
                            {item.badge > 99 ? "99+" : item.badge}
                          </Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {isAuthenticated ? (
                <View className="mt-6 pt-5 border-t border-[#DCDCDC] flex-col gap-3">
                  <Text className="font-inter-medium text-xs uppercase tracking-wider text-[#595959] px-2">
                    Cuenta y sesión
                  </Text>

                  <TouchableOpacity
                    onPress={() => setConfirmRoleSwitchOpen(true)}
                    className="min-h-[48px] flex-row items-center gap-3 rounded-xl border-[1.5px] border-[#B8860B] bg-white px-4 py-3"
                  >
                    <ArrowLeftRight size={18} color="#B8860B" />
                    <Text className="font-inter-medium text-sm text-[#B8860B]">
                      {isGuest ? "Cambiar a Anfitrión" : "Cambiar a Huésped"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setConfirmLogoutOpen(true)}
                    className="min-h-[48px] flex-row items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                  >
                    <LogOut size={18} color="#DC2626" />
                    <Text className="font-inter-medium text-sm text-[#DC2626]">
                      Cerrar sesión
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </ScrollView>
          </SafeAreaView>

          {/* Área de cierre al tocar fuera */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={onClose}
            className="flex-1"
          />
        </View>
      </Modal>

      {/* Confirmación de cambio de rol (Sección 5.6) */}
      <ConfirmActionModal
        open={confirmRoleSwitchOpen}
        type="confirm"
        title={isGuest ? "Cambiar a Anfitrión" : "Cambiar a Huésped"}
        description={
          isGuest
            ? "¿Deseas cambiar tu vista activa al modo Anfitrión para gestionar propiedades y reservas recibidas?"
            : "¿Deseas cambiar tu vista activa al modo Huésped para explorar alojamientos y revisar tus reservas?"
        }
        cancelLabel="Cancelar"
        confirmLabel="Sí, cambiar"
        confirmVariant="adminPrimary"
        onCancel={() => setConfirmRoleSwitchOpen(false)}
        onConfirm={handleConfirmSwitchRole}
      />

      {/* Confirmación de cierre de sesión (Sección 5.6) */}
      <ConfirmActionModal
        open={confirmLogoutOpen}
        type="confirm"
        title="Cerrar sesión"
        description="¿Estás seguro de que deseas cerrar tu sesión actual en NoWayHome?"
        cancelLabel="Cancelar"
        confirmLabel="Cerrar sesión"
        confirmVariant="adminDanger"
        onCancel={() => setConfirmLogoutOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}

export default NavigationDrawer;
