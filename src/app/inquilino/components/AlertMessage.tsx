import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
} from "lucide-react-native";
import React from "react";
import { Text, View, type ViewProps } from "react-native";

export type AlertVariant = "error" | "success" | "warning" | "info";

interface VariantConfig {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  containerClassName: string;
  textClassName: string;
  iconColor: string;
}

const variants: Record<AlertVariant, VariantConfig> = {
  error: {
    icon: AlertCircle,
    containerClassName: "border-red-200 bg-red-50",
    textClassName: "text-red-800",
    iconColor: "#DC2626",
  },
  success: {
    icon: CheckCircle2,
    containerClassName: "border-[#6B8E23]/30 bg-[#F2E8CF]",
    textClassName: "text-[#5F5F5F]",
    iconColor: "#6B8E23",
  },
  warning: {
    icon: TriangleAlert,
    containerClassName: "border-amber-200 bg-amber-50",
    textClassName: "text-amber-800",
    iconColor: "#D97706",
  },
  info: {
    icon: Info,
    containerClassName: "border-[#6B8E23]/20 bg-white",
    textClassName: "text-[#5F5F5F]",
    iconColor: "#6B8E23",
  },
};

export interface AlertMessageProps extends ViewProps {
  type?: AlertVariant;
  title?: string;
  message?: string;
  className?: string;
}

export function AlertMessage({
  type = "info",
  title,
  message,
  className = "",
  ...props
}: AlertMessageProps) {
  if (!message && !title) return null;

  const variant = variants[type] || variants.info;
  const Icon = variant.icon;

  return (
    <View
      accessibilityRole="alert"
      className={`flex-row items-start gap-3 rounded-xl border p-4 shadow-sm ${variant.containerClassName} ${className}`}
      {...props}
    >
      <View className="mt-0.5">
        <Icon size={20} color={variant.iconColor} />
      </View>
      <View className="flex-1">
        {title ? (
          <Text className={`font-semibold text-sm ${variant.textClassName}`}>
            {title}
          </Text>
        ) : null}
        {message ? (
          <Text
            className={`text-sm ${title ? "mt-1" : ""} ${variant.textClassName}`}
          >
            {message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default AlertMessage;
