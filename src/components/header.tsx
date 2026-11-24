import { usePathname, useRouter } from "expo-router";
import { Bell, Home, LogIn, LogOut, Menu, User } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { useInAppNotifications } from "@/services/inAppNotificationService";
import { authService } from "../services/authService";
import {
  resolveUserRole,
  type SessionUserLike,
} from "../utils/sessionRole";
import { ConfirmActionModal } from "./ConfirmActionModal";
import { NavigationDrawer } from "./NavigationDrawer";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useInAppNotifications();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [session, setSession] = useState(() => authService.getSession());

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextSession) => {
      setSession(nextSession);
    });
    return unsubscribe;
  }, []);

  const handleNavigation = (path: any) => {
    router.push(path);
    setIsDrawerOpen(false);
  };

  const handleConfirmLogout = () => {
    setConfirmLogoutOpen(false);
    setIsDrawerOpen(false);
    authService.logout();
    router.replace("/" as any);
  };

  const isAuthenticated = Boolean(session?.isAuthenticated);
  const isArrendatario =
    resolveUserRole(
      (session?.user as SessionUserLike | null) ?? null,
      session?.role,
    ) === "arrendatario";
  const profileRoute = isArrendatario
    ? "/arrendatario/profileArrendatario"
    : "/inquilino/profileInquilino";
  const isLoginRoute =
    pathname === "/loginPage" || pathname === "/loginpage";

  return (
    <>
      <View className="bg-[#FAFAFA] border-b border-[#DCDCDC] z-50">
        <View className="container mx-auto px-4">
          <View className="flex-row items-center justify-between h-16">
            {/* Logo */}
            <TouchableOpacity
              onPress={() => handleNavigation("/")}
              activeOpacity={0.8}
              className="flex-row items-center gap-2.5 min-h-[44px]"
            >
              <View className="h-9 w-9 rounded-xl bg-[#B8860B] items-center justify-center">
                <Home color="#FFFFFF" size={18} />
              </View>
              <Text className="font-poppins font-semibold text-xl md:text-2xl text-[#1C1C1C]">
                NoWayHome
              </Text>
            </TouchableOpacity>

            {/* Desktop Navigation */}
            <View className="hidden md:flex flex-row items-center gap-5">
              {isAuthenticated ? (
                <>
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
                    onPress={() => handleNavigation(profileRoute)}
                    className="flex-row items-center gap-2 min-h-[44px]"
                  >
                    <User color="#B8860B" size={20} />
                    <Text className="font-inter-medium text-[#B8860B]">
                      {(session?.user as any)?.nombre ||
                        (session?.user as any)?.correo ||
                        "Mi Cuenta"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setConfirmLogoutOpen(true)}
                    className="flex-row items-center gap-1.5 py-2 min-h-[44px]"
                  >
                    <LogOut color="#DC2626" size={18} />
                    <Text className="font-inter-medium text-[#DC2626]">
                      Salir
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => handleNavigation("/loginPage")}
                    className="flex-row items-center gap-2 py-2 min-h-[44px]"
                  >
                    <LogIn
                      color={isLoginRoute ? "#B8860B" : "#B87333"}
                      size={20}
                    />
                    <Text
                      className={`font-inter-medium ${
                        isLoginRoute ? "text-[#B8860B]" : "text-[#1C1C1C]"
                      }`}
                    >
                      Iniciar Sesión
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleNavigation("/registerPage")}
                    className="bg-[#B8860B] min-h-[44px] px-4 py-2 rounded-xl items-center justify-center"
                  >
                    <Text className="font-inter-medium text-white">
                      Crear Cuenta
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Mobile Controls: Notificaciones (si autenticado) + Menú Hamburguesa */}
            <View className="flex-row items-center gap-2 md:hidden">
              {isAuthenticated ? (
                <TouchableOpacity
                  onPress={() => handleNavigation("/notificaciones")}
                  className="relative h-11 w-11 items-center justify-center rounded-xl border border-[#DCDCDC] bg-white"
                  accessibilityLabel="Ver notificaciones"
                >
                  <Bell color="#B87333" size={20} />
                  {unreadCount > 0 ? (
                    <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#B8860B] px-1 items-center justify-center">
                      <Text className="font-inter-semibold text-[10px] text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={() => setIsDrawerOpen(true)}
                className="h-11 w-11 items-center justify-center rounded-xl border border-[#DCDCDC] bg-white"
                accessibilityLabel="Abrir menú"
              >
                <Menu color="#1C1C1C" size={22} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <NavigationDrawer
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
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
