import { usePathname, useRouter } from "expo-router";
import {
  Building2,
  Home,
  LogIn,
  LogOut,
  Menu,
  User,
  UserPlus,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { authService } from "@/services/authService";
import {
  getStoredSessionUser,
  type SessionUserLike,
} from "@/utils/sessionRole";

export function HeaderInquilino() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sessionState, setSessionState] = useState<{
    isAuthenticated: boolean;
    user: SessionUserLike | null;
  }>(() => {
    const initialSession = authService.getSession();
    const initialUser = getStoredSessionUser();
    return {
      isAuthenticated: Boolean(initialSession?.isAuthenticated || initialUser),
      user: initialUser,
    };
  });

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextSession) => {
      const nextUser =
        (nextSession?.user as SessionUserLike | null) || null;
      setSessionState({
        isAuthenticated: Boolean(nextSession?.isAuthenticated && nextUser),
        user: nextUser,
      });
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const isLoggedIn = Boolean(sessionState.isAuthenticated && sessionState.user);

  const navItems = isLoggedIn
    ? [
        {
          label: "Explorar",
          path: "/inquilino/ExplorarPage",
          icon: Home,
        },
        {
          label: "Mi Perfil",
          path: "/inquilino/profileInquilino",
          icon: User,
        },
      ]
    : [
        {
          label: "Inicio",
          path: "/",
          icon: Home,
        },
        {
          label: "Explorar",
          path: "/inquilino/ExplorarPage",
          icon: Building2,
        },
        {
          label: "Iniciar Sesión",
          path: "/loginPage",
          icon: LogIn,
        },
        {
          label: "Registrarse",
          path: "/registerPage",
          icon: UserPlus,
        },
      ];

  const activeRoute = (targetPath: string) => {
    const current = (pathname || "").toLowerCase();
    const target = targetPath.toLowerCase();
    if (target === "/") {
      return current === "/";
    }
    if (target.includes("explorarpage")) {
      return current.includes("explorarpage");
    }
    return current === target || current.endsWith(target);
  };

  const handleNavigation = (targetPath: string) => {
    setIsMobileMenuOpen(false);
    router.push(targetPath as any);
  };

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    authService.logout();
    router.replace("/" as any);
  };

  return (
    <View className="z-50 border-b border-[#A67C52]/10 bg-[#FAFAFA]">
      <View className="flex-row items-center justify-between px-4 py-3">
        {/* Botón de Inicio / Logo */}
        <TouchableOpacity
          onPress={() =>
            handleNavigation(
              isLoggedIn ? "/inquilino/ExplorarPage" : "/",
            )
          }
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
        </TouchableOpacity>

        {/* Navegación Desktop / Tablet */}
        <View className="hidden md:flex flex-row items-center gap-2">
          {navItems.map(({ label, path, icon: Icon }) => {
            const isActive = activeRoute(path);
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

          {isLoggedIn && (
            <TouchableOpacity
              onPress={handleLogout}
              className="flex-row items-center gap-2 rounded-full bg-red-50 border border-red-100 px-4 py-2 ml-2"
            >
              <LogOut size={16} color="#DC2626" />
              <Text className="text-sm font-semibold text-red-600">
                Cerrar Sesión
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Botón de Menú Móvil */}
        <TouchableOpacity
          onPress={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="h-11 w-11 items-center justify-center rounded-full border border-[#A67C52]/20 bg-white md:hidden"
          accessibilityLabel="Abrir menú"
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
            {navItems.map(({ label, path, icon: Icon }) => {
              const isActive = activeRoute(path);
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

            {isLoggedIn && (
              <TouchableOpacity
                onPress={handleLogout}
                className="flex-row items-center justify-center gap-2 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 mt-1"
              >
                <LogOut size={18} color="#DC2626" />
                <Text className="text-sm font-semibold text-red-600">
                  Cerrar Sesión
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export const InquilinoNavbar = HeaderInquilino;
export default HeaderInquilino;
