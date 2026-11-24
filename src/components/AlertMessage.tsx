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
    containerClassName: "border-[#B8860B]/30 bg-[#F5F2EC]",
    textClassName: "text-[#1C1C1C]",
    iconColor: "#B8860B",
  },
  warning: {
    icon: TriangleAlert,
    containerClassName: "border-[#B87333]/35 bg-amber-50",
    textClassName: "text-[#1C1C1C]",
    iconColor: "#B87333",
  },
  info: {
    icon: Info,
    containerClassName: "border-[#DCDCDC] bg-white",
    textClassName: "text-[#1C1C1C]",
    iconColor: "#B87333",
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
          <Text className={`font-poppins font-semibold text-sm ${variant.textClassName}`}>
            {title}
          </Text>
        ) : null}
        {message ? (
          <Text
            className={`font-inter text-sm leading-5 ${title ? "mt-1" : ""} ${variant.textClassName}`}
          >
            {message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default AlertMessage;
