import { usePathname, useRouter } from "expo-router";
import {
  ArrowLeftRight,
  Bell,
  Building2,
  Calendar,
  Home,
  LogOut,
  Menu,
  Plus,
  User,
} from "lucide-react-native";
import React, { useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

import { authService } from "@/services/authService";
import { useInAppNotifications } from "@/services/inAppNotificationService";
import { ConfirmActionModal } from "./ConfirmActionModal";
import { NavigationDrawer } from "./NavigationDrawer";

const ARRENDATARIO_NAV_ITEMS = [
  {
    label: "Mi Perfil",
    path: "/arrendatario/profileArrendatario",
    icon: User,
  },
  {
    label: "Mis Propiedades",
    path: "/arrendatario/MisPropiedades",
    icon: Building2,
  },
  {
    label: "Publicar",
    path: "/arrendatario/crearPropiedad",
    icon: Plus,
  },
  {
    label: "Reservas",
    path: "/arrendatario/ReservasArrendatario",
    icon: Calendar,
  },
];

export function HeaderArrendatario() {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useInAppNotifications();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [confirmSwitchOpen, setConfirmSwitchOpen] = useState(false);

  const isActiveRoute = (targetPath: string) => {
    const current = (pathname || "").toLowerCase();
    const target = targetPath.toLowerCase();
    return current === target || current.endsWith(target);
  };

  const handleNavigation = (targetPath: string) => {
    setIsDrawerOpen(false);
    if (isActiveRoute(targetPath)) {
      return;
    }
    router.push(targetPath as any);
  };

  const handleGoToProfile = () => {
    setIsDrawerOpen(false);
    if (isActiveRoute("/arrendatario/profileArrendatario")) {
      return;
    }
    router.push("/arrendatario/profileArrendatario" as any);
  };

  const handleConfirmLogout = () => {
    setConfirmLogoutOpen(false);
    setIsDrawerOpen(false);
    authService.logout();
    router.replace("/" as any);
  };

  const handleConfirmSwitchToGuest = () => {
    setConfirmSwitchOpen(false);
    const result = authService.switchRole("inquilino");
    if (result?.success) {
      router.replace("/inquilino/ExplorarPage" as any);
    }
  };

  return (
    <>
      <View className="z-50 border-b border-[#DCDCDC] bg-[#FAFAFA]">
        <View className="flex-row items-center justify-between px-4 py-3">
          {/* Logo / Nombre de la app */}
          <TouchableOpacity
            onPress={handleGoToProfile}
            activeOpacity={0.8}
            className="flex-row items-center gap-2 rounded-full bg-white border border-[#DCDCDC] px-3.5 py-2"
            style={
              Platform.OS === "ios"
                ? {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                  }
                : { elevation: 1 }
            }
          >
            <Home size={18} color="#B8860B" />
            <Text className="font-poppins text-base font-semibold text-[#1C1C1C]">
              NoWayHome
            </Text>
            <View className="bg-[#B8860B]/15 px-2 py-0.5 rounded-full">
              <Text className="font-inter-semibold text-[10px] text-[#B8860B]">
                Anfitrión
              </Text>
            </View>
          </TouchableOpacity>

          {/* Navegación Desktop / Tablet */}
          <View className="hidden md:flex flex-row items-center gap-2">
            {ARRENDATARIO_NAV_ITEMS.map(({ label, path, icon: Icon }) => {
              const isActive = isActiveRoute(path);
              return (
                <TouchableOpacity
                  key={label}
                  onPress={() => handleNavigation(path)}
                  className={`flex-row items-center gap-2 rounded-xl px-3.5 py-2 ${
                    isActive ? "bg-[#B8860B]/12" : ""
                  }`}
                >
                  <Icon size={16} color={isActive ? "#B8860B" : "#B87333"} />
                  <Text
                    className={`font-inter-medium text-sm ${
                      isActive ? "text-[#B8860B]" : "text-[#1C1C1C]"
                    }`}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() => handleNavigation("/notificaciones")}
              className="relative h-11 w-11 items-center justify-center rounded-xl border border-[#DCDCDC] bg-white"
              accessibilityLabel="Notificaciones"
            >
              <Bell size={18} color="#B87333" />
              {unreadCount > 0 ? (
                <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#B8860B] px-1 items-center justify-center">
                  <Text className="font-inter-semibold text-[10px] text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setConfirmSwitchOpen(true)}
              className="flex-row items-center gap-1.5 rounded-xl border-[1.5px] border-[#B8860B] px-3 py-2"
            >
              <ArrowLeftRight size={15} color="#B8860B" />
              <Text className="font-inter-medium text-xs text-[#B8860B]">
                Huésped
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setConfirmLogoutOpen(true)}
              activeOpacity={0.8}
              className="flex-row items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2 ml-1"
            >
              <LogOut size={16} color="#DC2626" />
              <Text className="font-inter-medium text-sm text-[#DC2626]">
                Cerrar Sesión
              </Text>
            </TouchableOpacity>
          </View>

          {/* Controles Móviles: Notificaciones + Menú Hamburguesa */}
          <View className="flex-row items-center gap-2 md:hidden">
            <TouchableOpacity
              onPress={() => handleNavigation("/notificaciones")}
              className="relative h-11 w-11 items-center justify-center rounded-xl border border-[#DCDCDC] bg-white"
              accessibilityLabel="Ver notificaciones"
            >
              <Bell size={20} color="#B87333" />
              {unreadCount > 0 ? (
                <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#B8860B] px-1 items-center justify-center">
                  <Text className="font-inter-semibold text-[10px] text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsDrawerOpen(true)}
              className="h-11 w-11 items-center justify-center rounded-xl border border-[#DCDCDC] bg-white"
              accessibilityLabel="Abrir menú de anfitrión"
            >
              <Menu size={20} color="#1C1C1C" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <NavigationDrawer
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      <ConfirmActionModal
        open={confirmSwitchOpen}
        type="confirm"
        title="Cambiar a Huésped"
        description="¿Deseas cambiar tu vista activa al modo Huésped para explorar alojamientos y consultar tus reservas?"
        cancelLabel="Cancelar"
        confirmLabel="Sí, cambiar"
        confirmVariant="adminPrimary"
        onCancel={() => setConfirmSwitchOpen(false)}
        onConfirm={handleConfirmSwitchToGuest}
      />

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

export default HeaderArrendatario;
