import "../global.css";
import { Stack, usePathname, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { BackHandler, Platform } from "react-native";
import { authService } from "@/services/authService";

function isProtectedPath(pathname: string): boolean {
  const clean = (pathname || "").toLowerCase();
  return (
    clean.startsWith("/inquilino/profileinquilino") ||
    clean.startsWith("/inquilino/reservapage") ||
    clean.startsWith("/inquilino/detallesreservapage") ||
    clean.startsWith("/arrendatario")
  );
}

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState(() => authService.getSession());
  const isAuthenticated = Boolean(session?.isAuthenticated);

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextSession) => {
      setSession(nextSession);
    });
    return unsubscribe;
  }, []);

  // Proteger rutas privadas cuando la sesión está cerrada
  useEffect(() => {
    if (!isAuthenticated && isProtectedPath(pathname)) {
      router.replace("/" as any);
    }
  }, [isAuthenticated, pathname, router]);

  // Bloquear botón/flecha de regresar del teléfono cuando ya se cerró sesión
  // Si la sesión sigue activa (isAuthenticated === true), permite regresar normalmente
  useEffect(() => {
    const onHardwareBackPress = () => {
      if (authService.isAuthenticated()) {
        // Sesión activa: permitir comportamiento normal de regresar a la pantalla anterior
        return false;
      }

      // Sesión cerrada: prohibir regresar al historial anterior
      const currentPath = (pathname || "/").toLowerCase();
      if (currentPath !== "/") {
        router.replace("/" as any);
      }
      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onHardwareBackPress,
    );

    return () => {
      subscription.remove();
    };
  }, [pathname, router]);

  // Bloquear retroceso del historial en entorno Web cuando la sesión está cerrada
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    if (!isAuthenticated) {
      window.history.pushState(null, "", window.location.href);
    }

    const handlePopState = () => {
      if (!authService.isAuthenticated()) {
        window.history.pushState(null, "", "/");
        router.replace("/" as any);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isAuthenticated, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: isAuthenticated,
      }}
    />
  );
}
