import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCheck,
  ChevronRight,
  Trash2,
} from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomTabBar } from "@/components/BottomTabBar";
import { ConfirmActionModal } from "@/components/ConfirmActionModal";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/header";
import { HeaderArrendatario } from "@/components/headerArrendatario";
import { HeaderInquilino } from "@/components/headerInquilino";
import { authService } from "@/services/authService";
import {
  useInAppNotifications,
  type InAppNotificationItem,
} from "@/services/inAppNotificationService";
import { getStoredSessionUser, resolveUserRole } from "@/utils/sessionRole";

function formatNotificationTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString("es-MX", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function NotificacionesPage() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useInAppNotifications();
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const session = authService.getSession();
  const user = getStoredSessionUser();
  const role = resolveUserRole(user, session?.role);

  const renderHeader = () => {
    if (!session?.isAuthenticated) return <Header />;
    if (role === "arrendatario") return <HeaderArrendatario />;
    return <HeaderInquilino />;
  };

  const handleOpenNotification = (item: InAppNotificationItem) => {
    markAsRead(item.id);
    if (item.screen) {
      router.push(item.screen as any);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      {renderHeader()}

      <ScrollView
        className="flex-1 bg-[#FAFAFA] px-4 py-6"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace(
                  (role === "arrendatario"
                    ? "/arrendatario/profileArrendatario"
                    : session?.isAuthenticated
                      ? "/inquilino/profileInquilino"
                      : "/") as any,
                )
          }
          className="mb-5 min-h-[44px] flex-row items-center self-start px-2"
        >
          <ArrowLeft size={18} color="#B87333" />
          <Text className="ml-2 font-inter-medium text-sm text-[#1C1C1C]">
            Volver
          </Text>
        </TouchableOpacity>

        <View className="mb-6 flex-row items-center justify-between gap-3">
          <View className="flex-row items-center gap-3 flex-1">
            <View className="h-12 w-12 rounded-2xl bg-[#F5F2EC] border border-[#DCDCDC] items-center justify-center">
              <Bell size={22} color="#B8860B" />
            </View>
            <View className="flex-1">
              <Text className="font-poppins text-2xl font-semibold text-[#1C1C1C]">
                Notificaciones
              </Text>
              <Text className="font-inter text-sm text-[#595959]">
                {unreadCount > 0
                  ? `${unreadCount} ${unreadCount === 1 ? "evento pendiente" : "eventos pendientes"}`
                  : "Estás al día con tu actividad"}
              </Text>
            </View>
          </View>
        </View>

        {notifications.length > 0 ? (
          <View className="flex-row gap-3 mb-5">
            {unreadCount > 0 ? (
              <TouchableOpacity
                onPress={markAllAsRead}
                className="flex-1 min-h-[48px] flex-row items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#B8860B] bg-white px-3"
              >
                <CheckCheck size={16} color="#B8860B" />
                <Text className="font-inter-medium text-xs text-[#B8860B]">
                  Marcar leídas
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={() => setConfirmClearOpen(true)}
              className="flex-1 min-h-[48px] flex-row items-center justify-center gap-2 rounded-xl border border-[#DCDCDC] bg-white px-3"
            >
              <Trash2 size={16} color="#B87333" />
              <Text className="font-inter-medium text-xs text-[#1C1C1C]">
                Limpiar historial
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {notifications.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title="Sin notificaciones pendientes"
            message="Aquí aparecerán las actualizaciones de tus reservas, pagos y propiedades."
          />
        ) : (
          <View className="flex-col gap-3">
            {notifications.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                onPress={() => handleOpenNotification(item)}
                className={`rounded-2xl border p-4 flex-row items-start gap-3 ${
                  item.read
                    ? "bg-white border-[#DCDCDC]"
                    : "bg-[#F5F2EC] border-[#B8860B]"
                }`}
              >
                <View
                  className={`mt-0.5 h-10 w-10 rounded-full items-center justify-center ${
                    item.read ? "bg-[#FAFAFA]" : "bg-[#B8860B]"
                  }`}
                >
                  <Bell size={18} color={item.read ? "#B87333" : "#FFFFFF"} />
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="flex-1 font-poppins text-sm font-semibold text-[#1C1C1C]">
                      {item.title}
                    </Text>
                    {!item.read ? (
                      <View className="rounded-full bg-[#B8860B] px-2 py-0.5">
                        <Text className="font-inter-semibold text-[10px] text-white">
                          Nuevo
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text className="mt-1 font-inter text-sm leading-5 text-[#595959]">
                    {item.body}
                  </Text>

                  <View className="mt-2 flex-row items-center justify-between">
                    <Text className="font-inter text-xs text-[#595959]">
                      {formatNotificationTime(item.createdAt)}
                    </Text>
                    {item.screen ? (
                      <View className="flex-row items-center">
                        <Text className="font-inter-medium text-xs text-[#B8860B]">
                          Ver detalle
                        </Text>
                        <ChevronRight size={14} color="#B8860B" />
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <BottomTabBar />

      <ConfirmActionModal
        open={confirmClearOpen}
        type="confirm"
        title="Limpiar notificaciones"
        description="¿Deseas eliminar todas las notificaciones guardadas en tu historial?"
        cancelLabel="Cancelar"
        confirmLabel="Sí, limpiar"
        confirmVariant="adminDanger"
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={() => {
          clearAll();
          setConfirmClearOpen(false);
        }}
      />
    </SafeAreaView>
  );
}
