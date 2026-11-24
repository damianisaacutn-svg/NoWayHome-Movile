import { usePathname, useRouter } from "expo-router";
import {
  Building2,
  Calendar,
  Compass,
  Heart,
  Home,
  LogIn,
  PlusCircle,
  User,
  UserPlus,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { authService } from "@/services/authService";
import {
  getStoredSessionUser,
  resolveUserRole,
  type AppUserRole,
  type SessionUserLike,
} from "@/utils/sessionRole";

interface TabItem {
  key: string;
  label: string;
  path: string;
  matchPaths: string[];
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const [sessionState, setSessionState] = useState<{
    isAuthenticated: boolean;
    role: AppUserRole | null;
  }>(() => {
    const s = authService.getSession();
    const u = getStoredSessionUser();
    return {
      isAuthenticated: Boolean(s?.isAuthenticated),
      role: resolveUserRole(u, s?.role),
    };
  });

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextSession) => {
      const u =
        (nextSession?.user as SessionUserLike | null) || getStoredSessionUser();
      setSessionState({
        isAuthenticated: Boolean(nextSession?.isAuthenticated),
        role: resolveUserRole(u, nextSession?.role),
      });
    });
    return unsubscribe;
  }, []);

  const { isAuthenticated, role } = sessionState;
  const isHost = isAuthenticated && role === "arrendatario";

  const tabs: TabItem[] = !isAuthenticated
    ? [
        {
          key: "home",
          label: "Inicio",
          path: "/",
          matchPaths: ["/"],
          icon: Home,
        },
        {
          key: "explore",
          label: "Explorar",
          path: "/?ver=explorar",
          matchPaths: ["/inquilino/detallespropiedadpage"],
          icon: Compass,
        },
        {
          key: "login",
          label: "Entrar",
          path: "/loginPage",
          matchPaths: ["/loginpage", "/forgotpassword", "/resetpassword"],
          icon: LogIn,
        },
        {
          key: "register",
          label: "Cuenta",
          path: "/registerPage",
          matchPaths: ["/registerpage"],
          icon: UserPlus,
        },
      ]
    : isHost
      ? [
          {
            key: "properties",
            label: "Propiedades",
            path: "/arrendatario/MisPropiedades",
            matchPaths: [
              "/arrendatario/mispropiedades",
              "/arrendatario/editarpropiedad",
            ],
            icon: Building2,
          },
          {
            key: "publish",
            label: "Publicar",
            path: "/arrendatario/crearPropiedad",
            matchPaths: ["/arrendatario/crearpropiedad"],
            icon: PlusCircle,
          },
          {
            key: "bookings",
            label: "Reservas",
            path: "/arrendatario/ReservasArrendatario",
            matchPaths: ["/arrendatario/reservasarrendatario"],
            icon: Calendar,
          },
          {
            key: "profile",
            label: "Perfil",
            path: "/arrendatario/profileArrendatario",
            matchPaths: ["/arrendatario/profilearrendatario"],
            icon: User,
          },
        ]
      : [
          {
            key: "explore",
            label: "Explorar",
            path: "/inquilino/ExplorarPage",
            matchPaths: [
              "/inquilino/explorarpage",
              "/inquilino/detallespropiedadpage",
              "/inquilino/reservapage",
            ],
            icon: Compass,
          },
          {
            key: "favorites",
            label: "Favoritos",
            path: "/inquilino/profileInquilino?tab=favorites",
            matchPaths: [],
            icon: Heart,
          },
          {
            key: "bookings",
            label: "Reservas",
            path: "/inquilino/profileInquilino?tab=bookings",
            matchPaths: ["/inquilino/detallesreservapage"],
            icon: Calendar,
          },
          {
            key: "profile",
            label: "Perfil",
            path: "/inquilino/profileInquilino",
            matchPaths: ["/inquilino/profileinquilino"],
            icon: User,
          },
        ];

  const cleanPath = (pathname || "/").toLowerCase();

  return (
    <View
      className="border-t border-[#DCDCDC] bg-white px-2 pt-2"
      style={{
        paddingBottom: Math.max(insets.bottom, Platform.OS === "ios" ? 12 : 8),
      }}
    >
      <View className="flex-row items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.matchPaths.includes(cleanPath);
          const color = isActive ? "#B8860B" : "#B87333";

          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.8}
              onPress={() => router.push(tab.path as any)}
              className={`min-h-[48px] flex-1 items-center justify-center rounded-xl py-1 px-1 ${
                isActive ? "bg-[#B8860B]/10" : "bg-transparent"
              }`}
            >
              <Icon size={20} color={color} />
              <Text
                numberOfLines={1}
                className={`mt-1 font-inter-medium text-[11px] ${
                  isActive ? "text-[#B8860B]" : "text-[#1C1C1C]"
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default BottomTabBar;
