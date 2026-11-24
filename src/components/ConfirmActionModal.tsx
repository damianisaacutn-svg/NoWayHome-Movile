import { AlertCircle, CheckCircle2, HelpCircle } from "lucide-react-native";
import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

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
      ? "Acción completada"
      : type === "error"
        ? "Error"
        : "Confirmar acción");
  const resolvedConfirmLabel =
    confirmLabel || (isConfirm ? "Confirmar" : "Entendido");
  const resolvedConfirmVariant =
    confirmVariant || (type === "error" ? "adminDanger" : "adminPrimary");

  const getVariantButtonClass = (variant: ButtonVariant): string => {
    switch (variant) {
      case "adminDanger":
        return "bg-[#DC2626] active:bg-[#B91C1C]";
      case "adminSecondary":
        return "border-[1.5px] border-[#B8860B] bg-transparent active:bg-[#B8860B]/10";
      case "adminPrimary":
      default:
        return "bg-[#B8860B] active:bg-[#9A6F09]";
    }
  };

  const getVariantTextClass = (variant: ButtonVariant): string => {
    if (variant === "adminSecondary") {
      return "text-[#B8860B]";
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
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        <View className="w-full max-w-md rounded-2xl border border-[#DCDCDC] bg-white p-6 shadow-xl">
          <View className="flex-row items-center gap-3">
            <View
              className={`h-10 w-10 items-center justify-center rounded-full ${
                type === "error" || resolvedConfirmVariant === "adminDanger"
                  ? "bg-red-50"
                  : type === "success"
                    ? "bg-[#B8860B]/15"
                    : "bg-[#F5F2EC]"
              }`}
            >
              {type === "error" || resolvedConfirmVariant === "adminDanger" ? (
                <AlertCircle size={20} color="#DC2626" />
              ) : type === "success" ? (
                <CheckCircle2 size={20} color="#B8860B" />
              ) : (
                <HelpCircle size={20} color="#B87333" />
              )}
            </View>
            <Text className="flex-1 font-poppins text-lg font-semibold text-[#1C1C1C]">
              {resolvedTitle}
            </Text>
          </View>

          <View className="mt-3">
            {typeof description === "string" ? (
              <Text className="font-inter text-sm leading-5 text-[#595959]">
                {description}
              </Text>
            ) : (
              description
            )}
          </View>

          <View className="mt-6 flex-row justify-end gap-3">
            {isConfirm && (
              <TouchableOpacity
                onPress={onCancel}
                disabled={disableCancel}
                className={`min-h-[48px] min-w-[96px] items-center justify-center rounded-xl border-[1.5px] border-[#B8860B] bg-transparent px-4 active:bg-[#B8860B]/10 ${
                  disableCancel ? "opacity-50" : ""
                }`}
              >
                <Text className="font-inter-medium text-sm text-[#B8860B]">
                  {cancelLabel}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={onConfirm}
              disabled={disableConfirm}
              className={`min-h-[48px] min-w-[108px] items-center justify-center rounded-xl px-4 ${getVariantButtonClass(
                resolvedConfirmVariant,
              )} ${confirmButtonClassName} ${disableConfirm ? "opacity-50" : ""}`}
            >
              <Text
                className={`font-inter-medium text-sm ${getVariantTextClass(
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
