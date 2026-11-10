import { usePathname, useRouter } from "expo-router";
import {
  Building2,
  Calendar,
  Home,
  LogOut,
  Menu,
  Plus,
  User,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { authService } from "@/services/authService";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActiveRoute = (targetPath: string) => {
    const current = (pathname || "").toLowerCase();
    const target = targetPath.toLowerCase();
    return current === target || current.endsWith(target);
  };

  const handleNavigation = (targetPath: string) => {
    setIsMobileMenuOpen(false);
    router.push(targetPath as any);
  };

  const handleGoToProfile = () => {
    setIsMobileMenuOpen(false);
    router.push("/arrendatario/profileArrendatario" as any);
  };

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    authService.logout();
    router.replace("/" as any);
  };

  return (
    <View className="z-50 border-b border-[#A67C52]/10 bg-[#FAFAFA]">
      <View className="flex-row items-center justify-between px-4 py-3">
        {/* Logo / Nombre de la app */}
        <TouchableOpacity
          onPress={handleGoToProfile}
          activeOpacity={0.8}
          className="flex-row items-center gap-2 rounded-full bg-white px-4 py-2"
          style={
            Platform.OS === "ios"
              ? {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                }
              : { elevation: 2 }
          }
        >
          <Home size={18} color="#6B8E23" />
          <Text className="text-base font-semibold text-[#6B8E23]">
            NoWayHome
          </Text>
          <View className="bg-[#6B8E23]/15 px-2 py-0.5 rounded-full">
            <Text className="text-[10px] font-semibold text-[#6B8E23]">
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
                className={`flex-row items-center gap-2 rounded-full px-4 py-2 ${
                  isActive ? "bg-[#A67C52]/10" : ""
                }`}
              >
                <Icon size={16} color={isActive ? "#6B8E23" : "#5F5F5F"} />
                <Text
                  className={`text-sm font-medium ${
                    isActive ? "text-[#6B8E23]" : "text-[#5F5F5F]"
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
            className="flex-row items-center gap-2 rounded-full bg-red-50 border border-red-100 px-4 py-2 ml-2"
          >
            <LogOut size={16} color="#DC2626" />
            <Text className="text-sm font-semibold text-red-600">
              Cerrar Sesión
            </Text>
          </TouchableOpacity>
        </View>

        {/* Botón de Menú Móvil */}
        <TouchableOpacity
          onPress={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="h-11 w-11 items-center justify-center rounded-full border border-[#A67C52]/20 bg-white md:hidden"
          accessibilityLabel="Abrir menú de anfitrión"
        >
          {isMobileMenuOpen ? (
            <X size={20} color="#5F5F5F" />
          ) : (
            <Menu size={20} color="#5F5F5F" />
          )}
        </TouchableOpacity>
      </View>

      {/* Menú Desplegable Móvil */}
      {isMobileMenuOpen && (
        <View className="border-t border-[#A67C52]/10 bg-[#FAFAFA] px-4 py-4 md:hidden">
          <View className="flex-col gap-3">
            {ARRENDATARIO_NAV_ITEMS.map(({ label, path, icon: Icon }) => {
              const isActive = isActiveRoute(path);
              return (
                <TouchableOpacity
                  key={label}
                  onPress={() => handleNavigation(path)}
                  className={`flex-row items-center gap-3 rounded-2xl px-4 py-3 ${
                    isActive ? "bg-[#A67C52]/10" : "bg-white"
                  }`}
                >
                  <Icon size={18} color={isActive ? "#6B8E23" : "#5F5F5F"} />
                  <Text
                    className={`text-sm font-medium ${
                      isActive ? "text-[#6B8E23]" : "text-[#5F5F5F]"
                    }`}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={handleLogout}
              className="flex-row items-center justify-center gap-2 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 mt-1"
            >
              <LogOut size={18} color="#DC2626" />
              <Text className="text-sm font-semibold text-red-600">
                Cerrar Sesión
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default HeaderArrendatario;
