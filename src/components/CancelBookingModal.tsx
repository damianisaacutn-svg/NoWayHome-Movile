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
  const [isFocused, setIsFocused] = useState(false);

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
        <View className="w-full max-w-md rounded-2xl border border-[#DCDCDC] bg-white p-6 shadow-xl">
          <Text className="font-poppins text-xl font-semibold text-[#1C1C1C] mb-2">
            {title}
          </Text>
          <Text className="font-inter text-sm text-[#595959] mb-4 leading-5">
            {description}
          </Text>

          {displayError ? (
            <View className="flex-row items-center p-3 mb-4 rounded-xl border border-red-200 bg-red-50">
              <AlertCircle size={18} color="#DC2626" />
              <Text className="ml-2 flex-1 font-inter text-sm text-red-800">
                {displayError}
              </Text>
            </View>
          ) : null}

          <Text className="font-inter-medium text-sm text-[#1C1C1C] mb-1.5">
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
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            editable={!isLoading}
            placeholder="Ej: Surgió un imprevisto con la propiedad o el huésped..."
            placeholderTextColor="#7A7A7A"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className={`min-h-[96px] p-3.5 rounded-xl border font-inter text-[#1C1C1C] bg-[#FAFAFA] mb-5 ${
              displayError
                ? "border-[#DC2626]"
                : isFocused
                  ? "border-[#B8860B] bg-white"
                  : "border-[#DCDCDC]"
            }`}
          />

          <View className="flex-col gap-3">
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isLoading || (requireReason && !reason.trim())}
              className={`min-h-[48px] bg-[#DC2626] rounded-xl py-3 items-center justify-center flex-row ${
                isLoading || (requireReason && !reason.trim())
                  ? "opacity-60"
                  : ""
              }`}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" className="mr-2" />
              ) : null}
              <Text className="font-inter-medium text-white text-base">
                {isLoading ? "Cancelando..." : "Confirmar cancelación"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClose}
              disabled={isLoading}
              className="min-h-[48px] border-[1.5px] border-[#B8860B] rounded-xl py-3 items-center justify-center"
            >
              <Text className="font-inter-medium text-[#B8860B] text-base">
                Volver
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default CancelBookingModal;
