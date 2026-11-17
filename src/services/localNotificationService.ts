import {
  addNotificationResponseReceivedListener,
  AndroidImportance,
  AndroidNotificationPriority,
  clearLastNotificationResponse,
  getLastNotificationResponse,
  getPermissionsAsync,
  IosAuthorizationStatus,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
  type NotificationPermissionsStatus,
  type NotificationResponse,
} from "expo-notifications";
import { Platform } from "react-native";

/**
 * Servicio de Notificaciones Locales (Expo Go compatible) - No Way Home
 *
 * Exclusivo para notificaciones locales en el dispositivo mediante
 * `Notifications.scheduleNotificationAsync`. No solicita ni gestiona
 * ExpoPushToken, FCM ni APNs remotos.
 */

const DEFAULT_CHANNEL_ID = "default";

let androidChannelConfigured = false;
let foregroundHandlerConfigured = false;

function isPermissionGranted(
  permissions: NotificationPermissionsStatus | null | undefined,
): boolean {
  if (!permissions) return false;
  return Boolean(
    permissions.granted ||
      permissions.status === "granted" ||
      permissions.ios?.status === IosAuthorizationStatus.AUTHORIZED ||
      permissions.ios?.status === IosAuthorizationStatus.PROVISIONAL,
  );
}

/**
 * Configura el manejador global para que las notificaciones locales suenen
 * y se muestren en la barra superior incluso con la app abierta en primer plano.
 */
export function configurarManejadorNotificaciones(): void {
  if (Platform.OS === "web" || foregroundHandlerConfigured) {
    return;
  }

  try {
    setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        priority: AndroidNotificationPriority.MAX,
      }),
    });
    foregroundHandlerConfigured = true;
  } catch (error) {
    console.warn(
      "[Notificaciones Locales] No se pudo configurar setNotificationHandler:",
      error,
    );
  }
}

// Registrar el manejador inmediatamente al importar el servicio en plataformas nativas.
configurarManejadorNotificaciones();

async function asegurarCanalAndroid(): Promise<void> {
  if (Platform.OS !== "android" || androidChannelConfigured) {
    return;
  }

  try {
    await setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
      name: "Notificaciones No Way Home",
      importance: AndroidImportance.MAX,
      enableVibrate: true,
      showBadge: true,
    });
  } catch {
    // Algunas versiones de Expo Go crean el canal aunque falle la serialización de retorno.
  } finally {
    androidChannelConfigured = true;
  }
}

/**
 * Solicita permisos de notificación local al usuario de forma compatible con
 * Expo Go (Android / iOS), sin intentar obtener tokens push remotos.
 */
export async function solicitarPermisosNotificaciones(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  configurarManejadorNotificaciones();
  await asegurarCanalAndroid();

  try {
    const existingPermissions = await getPermissionsAsync();
    if (isPermissionGranted(existingPermissions)) {
      return true;
    }

    const requestedPermissions = await requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    return isPermissionGranted(requestedPermissions);
  } catch (error) {
    console.warn(
      "[Notificaciones Locales] No se pudieron solicitar los permisos:",
      error,
    );
    return false;
  }
}

/**
 * Dispara una notificación local inmediata en la barra de notificaciones del dispositivo.
 */
export async function mostrarNotificacionLocal(
  titulo: string,
  cuerpo: string,
  data?: Record<string, unknown>,
): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    const hasPermission = await solicitarPermisosNotificaciones();
    if (!hasPermission) {
      return null;
    }

    return await scheduleNotificationAsync({
      content: {
        title: titulo,
        body: cuerpo,
        sound: "default",
        priority: AndroidNotificationPriority.MAX,
        ...(data ? { data } : {}),
      },
      trigger:
        Platform.OS === "android" ? { channelId: DEFAULT_CHANNEL_ID } : null,
    });
  } catch (error) {
    console.warn(
      "[Notificaciones Locales] Error al programar notificación local:",
      error,
    );
    return null;
  }
}

/**
 * Escucha cuando el usuario toca una notificación local para ejecutar acciones
 * (por ejemplo, navegar a una pantalla específica usando `data.screen`).
 */
export function configurarListenerRespuestaNotificacion(
  onResponse: (response: NotificationResponse) => void,
): () => void {
  if (Platform.OS === "web") {
    return () => {};
  }

  try {
    const lastResponse = getLastNotificationResponse();
    if (lastResponse) {
      onResponse(lastResponse);
      clearLastNotificationResponse();
    }
  } catch {
    // Ignorar si no está disponible en el entorno actual.
  }

  const subscription = addNotificationResponseReceivedListener((response) => {
    onResponse(response);
  });

  return () => {
    subscription.remove();
  };
}
