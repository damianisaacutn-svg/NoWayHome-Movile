// src/components/ConfirmActionModal.tsx
import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";

// ---------------------------------------------------------------------------
// TIPOS E INTERFACES
// ---------------------------------------------------------------------------

export type ConfirmModalType = "confirm" | "success" | "error" | string;

export type ButtonVariant =
  | "adminPrimary"
  | "adminSecondary"
  | "adminDanger"
  | string;

export interface ConfirmActionModalProps {
  open: boolean;
  type?: ConfirmModalType;
  title?: string;
  description?: React.ReactNode;
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
  confirmButtonClassName?: string;
  disableCancel?: boolean;
  disableConfirm?: boolean;
}

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------------------------

export function ConfirmActionModal({
  open,
  type = "confirm",
  title,
  description,
  onCancel,
  onConfirm,
  cancelLabel = "Cancelar",
  confirmLabel,
  confirmVariant,
  confirmButtonClassName = "",
  disableCancel = false,
  disableConfirm = false,
}: ConfirmActionModalProps) {
  if (!open) return null;

  const isConfirm = type === "confirm";
  const resolvedTitle =
    title ||
    (type === "success"
      ? "Accion completada"
      : type === "error"
        ? "Error"
        : "Confirmar accion");
  const resolvedConfirmLabel =
    confirmLabel || (isConfirm ? "Confirmar" : "Entendido");
  const resolvedConfirmVariant =
    confirmVariant || (type === "error" ? "adminDanger" : "adminPrimary");

  // Mapeo de variantes visuales a clases de NativeWind
  const getVariantButtonClass = (variant: ButtonVariant): string => {
    switch (variant) {
      case "adminDanger":
        return "bg-red-600 active:bg-red-700";
      case "adminSecondary":
        return "border border-gray-300 bg-white active:bg-gray-100";
      case "adminPrimary":
      default:
        return "bg-[#6B8E23] active:bg-[#5a7a1e]";
    }
  };

  const getVariantTextClass = (variant: ButtonVariant): string => {
    if (variant === "adminSecondary") {
      return "text-[#5F5F5F]";
    }
    return "text-white";
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onCancel || onConfirm}
    >
      <View className="flex-1 items-center justify-center bg-black/40 px-4">
        <View className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          {/* Título */}
          <Text className="text-lg font-semibold text-[#333333]">
            {resolvedTitle}
          </Text>

          {/* Descripción */}
          <View className="mt-3">
            {typeof description === "string" ? (
              <Text className="text-sm leading-5 text-[#555555]">
                {description}
              </Text>
            ) : (
              description
            )}
          </View>

          {/* Botones de Acción */}
          <View className="mt-6 flex-row justify-end gap-3">
            {isConfirm && (
              <TouchableOpacity
                onPress={onCancel}
                disabled={disableCancel}
                className={`min-w-[90px] items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 active:bg-gray-50 ${
                  disableCancel ? "opacity-50" : ""
                }`}
              >
                <Text className="text-sm font-medium text-[#5F5F5F]">
                  {cancelLabel}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={onConfirm}
              disabled={disableConfirm}
              className={`min-w-[100px] items-center justify-center rounded-xl px-4 py-2.5 ${getVariantButtonClass(
                resolvedConfirmVariant,
              )} ${confirmButtonClassName} ${disableConfirm ? "opacity-50" : ""}`}
            >
              <Text
                className={`text-sm font-semibold ${getVariantTextClass(
                  resolvedConfirmVariant,
                )}`}
              >
                {resolvedConfirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
