import { AlertCircle } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface CancelBookingModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
  error?: string;
  requireReason?: boolean;
  title?: string;
  description?: string;
}

export function CancelBookingModal({
  open,
  onClose,
  onConfirm,
  isLoading = false,
  error = "",
  requireReason = true,
  title = "Cancelar reserva",
  description = "Para cancelar esta reserva, indica el motivo a continuación. Esta acción no se puede deshacer.",
}: CancelBookingModalProps) {
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState("");

  const handleClose = () => {
    if (isLoading) return;
    setReason("");
    setLocalError("");
    onClose();
  };

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (requireReason && !trimmed) {
      setLocalError("Debes proporcionar un motivo para cancelar la reserva.");
      return;
    }
    setLocalError("");
    onConfirm(trimmed);
  };

  const displayError = error || localError;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        <View className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <Text className="font-poppins text-xl font-semibold text-[#5F5F5F] mb-2">
            {title}
          </Text>
          <Text className="text-sm text-[#5F5F5F]/75 mb-4 leading-5">
            {description}
          </Text>

          {displayError ? (
            <View className="flex-row items-center p-3 mb-4 rounded-xl border border-red-200 bg-red-50">
              <AlertCircle size={18} color="#DC2626" />
              <Text className="ml-2 flex-1 text-sm text-red-800">
                {displayError}
              </Text>
            </View>
          ) : null}

          <Text className="text-sm font-medium text-[#5F5F5F] mb-1.5">
            {requireReason
              ? "Motivo de la cancelación (obligatorio)"
              : "Motivo de la cancelación (opcional)"}
          </Text>
          <TextInput
            value={reason}
            onChangeText={(val) => {
              setReason(val);
              if (localError) setLocalError("");
            }}
            editable={!isLoading}
            placeholder="Ej: Surgió un imprevisto con la propiedad o el huésped..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="min-h-[96px] p-3 rounded-xl border border-[#6B8E23]/20 text-[#5F5F5F] bg-[#FAFAFA] mb-5"
          />

          <View className="flex-col gap-3">
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isLoading || (requireReason && !reason.trim())}
              className={`bg-red-600 rounded-xl py-3 items-center justify-center flex-row ${
                isLoading || (requireReason && !reason.trim())
                  ? "opacity-60"
                  : ""
              }`}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" className="mr-2" />
              ) : null}
              <Text className="text-white font-semibold">
                {isLoading ? "Cancelando..." : "Confirmar cancelación"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClose}
              disabled={isLoading}
              className="border-2 border-[#6B8E23] rounded-xl py-3 items-center"
            >
              <Text className="text-[#6B8E23] font-semibold">Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default CancelBookingModal;
