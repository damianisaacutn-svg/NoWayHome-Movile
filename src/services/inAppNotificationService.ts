import { useEffect, useState } from "react";

import { authService } from "@/services/authService";
import {
  getLandlordId,
  getStoredSessionUser,
  getTenantId,
  resolveUserRole,
  type AppUserRole,
} from "@/utils/sessionRole";

export interface InAppNotificationItem {
  id: string;
  title: string;
  body: string;
  screen?: string;
  createdAt: number;
  read: boolean;
  role?: AppUserRole | "guest";
}

const STORAGE_PREFIX = "nowayhome_in_app_notifications_";
const MAX_NOTIFICATIONS = 50;

const listeners = new Set<() => void>();

function getActiveNotificationBucket(): {
  key: string;
  role: AppUserRole | "guest";
} {
  const session = authService.getSession();
  if (!session?.isAuthenticated) {
    return { key: `${STORAGE_PREFIX}anonymous`, role: "guest" };
  }

  const user = getStoredSessionUser();
  const role = resolveUserRole(user, session?.role) ?? "inquilino";
  const userId =
    role === "arrendatario"
      ? getLandlordId(user, session?.role)
      : getTenantId(user, session?.role);

  return {
    key: `${STORAGE_PREFIX}${role}_${String(userId ?? "default")}`,
    role,
  };
}

function readBucket(key: string): InAppNotificationItem[] {
  try {
    const raw = authService.getStorageItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBucket(key: string, items: InAppNotificationItem[]): void {
  try {
    authService.setStorageItem(
      key,
      JSON.stringify(items.slice(0, MAX_NOTIFICATIONS)),
    );
  } catch {
    // Ignorar errores de almacenamiento
  }
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignorar errores de listener
    }
  });
}

export const inAppNotificationService = {
  getAll(): InAppNotificationItem[] {
    const { key } = getActiveNotificationBucket();
    return readBucket(key);
  },

  getUnreadCount(): number {
    return this.getAll().filter((item) => !item.read).length;
  },

  add(params: {
    title: string;
    body: string;
    screen?: string;
    dedupeKey?: string;
  }): InAppNotificationItem {
    const { key, role } = getActiveNotificationBucket();
    const existing = readBucket(key);

    if (
      params.dedupeKey &&
      existing.some((item) => item.id === params.dedupeKey)
    ) {
      return existing.find((item) => item.id === params.dedupeKey)!;
    }

    const item: InAppNotificationItem = {
      id:
        params.dedupeKey ||
        `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: params.title,
      body: params.body,
      screen: params.screen,
      createdAt: Date.now(),
      read: false,
      role,
    };

    writeBucket(key, [item, ...existing]);
    return item;
  },

  markAsRead(id: string): void {
    const { key } = getActiveNotificationBucket();
    const items = readBucket(key);
    const next = items.map((item) =>
      item.id === id ? { ...item, read: true } : item,
    );
    writeBucket(key, next);
  },

  markAllAsRead(): void {
    const { key } = getActiveNotificationBucket();
    const items = readBucket(key);
    const next = items.map((item) => ({ ...item, read: true }));
    writeBucket(key, next);
  },

  clearAll(): void {
    const { key } = getActiveNotificationBucket();
    writeBucket(key, []);
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useInAppNotifications() {
  const [items, setItems] = useState<InAppNotificationItem[]>(() =>
    inAppNotificationService.getAll(),
  );

  useEffect(() => {
    const refresh = () => {
      setItems(inAppNotificationService.getAll());
    };

    const unsubNotif = inAppNotificationService.subscribe(refresh);
    const unsubAuth = authService.subscribe(refresh);

    return () => {
      unsubNotif();
      unsubAuth();
    };
  }, []);

  const unreadCount = items.filter((item) => !item.read).length;

  return {
    notifications: items,
    unreadCount,
    markAsRead: (id: string) => inAppNotificationService.markAsRead(id),
    markAllAsRead: () => inAppNotificationService.markAllAsRead(),
    clearAll: () => inAppNotificationService.clearAll(),
  };
}
