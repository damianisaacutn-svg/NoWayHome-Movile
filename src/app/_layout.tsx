import "../global.css";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { AppState, BackHandler, Platform } from "react-native";

import { authService } from "@/services/authService";
import {
  configurarListenerRespuestaNotificacion,
  solicitarPermisosNotificaciones,
} from "@/services/localNotificationService";
import { sincronizarNotificacionesDeUsuario } from "@/services/notificationSyncService";

void SplashScreen.preventAutoHideAsync().catch(() => null);

function isProtectedPath(pathname: string): boolean {
  const clean = (pathname || "").toLowerCase();
  return (
    clean.startsWith("/inquilino/profileinquilino") ||
    clean.startsWith("/inquilino/explorarpage") ||
    clean.startsWith("/inquilino/reservapage") ||
    clean.startsWith("/inquilino/detallesreservapage") ||
    clean.startsWith("/arrendatario")
  );
}

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [fontsLoaded, fontError] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const [session, setSession] = useState(() => authService.getSession());
  const isAuthenticated = Boolean(session?.isAuthenticated);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync().catch(() => null);
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextSession) => {
      setSession(nextSession);
    });
    return unsubscribe;
  }, []);

  // Proteger rutas privadas cuando la sesión está cerrada
  useEffect(() => {
    if (
      !isAuthenticated &&
      !authService.isAuthenticated() &&
      isProtectedPath(pathname)
    ) {
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

  // Inicializar Notificaciones Locales (permisos y listener al tocar una notificación en Expo Go)
  useEffect(() => {
    void solicitarPermisosNotificaciones();

    const removeNotificationListener = configurarListenerRespuestaNotificacion(
      (response) => {
        const data = response?.notification?.request?.content?.data as
          | Record<string, any>
          | undefined;
        if (data?.screen && typeof data.screen === "string") {
          const targetScreen = data.screen.trim();
          if (!isProtectedPath(targetScreen) || authService.isAuthenticated()) {
            router.push(targetScreen as any);
          } else {
            router.push("/loginPage" as any);
          }
        }
      },
    );

    return () => {
      removeNotificationListener();
    };
  }, [router]);

  // Sincronización periódica y al volver a primer plano para disparar notificaciones locales
  // cuando llegan eventos del backend (nuevas reservas pendientes, aceptaciones, pagos o cancelaciones)
  useEffect(() => {
    if (Platform.OS === "web" || !isAuthenticated || !session) {
      return;
    }

    void sincronizarNotificacionesDeUsuario(session);

    const intervalId = setInterval(() => {
      void sincronizarNotificacionesDeUsuario();
    }, 12000);

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") {
          void sincronizarNotificacionesDeUsuario();
        }
      },
    );

    return () => {
      clearInterval(intervalId);
      appStateSubscription.remove();
    };
  }, [isAuthenticated, session]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: isAuthenticated,
      }}
    />
  );
}
