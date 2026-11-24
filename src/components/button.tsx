import React from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  type TouchableOpacityProps,
} from "react-native";

export type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"
  | "adminPrimary"
  | "adminSecondary"
  | "adminEdit"
  | "adminView"
  | "adminDanger"
  | "adminNeutral";

export type ButtonSize =
  | "default"
  | "sm"
  | "lg"
  | "icon"
  | "admin"
  | "adminCompact";

const variantContainerClasses: Record<ButtonVariant, string> = {
  // Botón primario: fondo ocre dorado (#B8860B), radio 12 px, altura mínima táctil 48 px
  default: "bg-[#B8860B] active:bg-[#9A6F09]",
  destructive: "bg-[#DC2626] active:bg-[#B91C1C]",
  // Botón secundario: fondo transparente, borde y texto ocre dorado
  outline: "border-[1.5px] border-[#B8860B] bg-transparent active:bg-[#B8860B]/10",
  secondary: "border-[1.5px] border-[#B8860B] bg-transparent active:bg-[#B8860B]/10",
  ghost: "bg-transparent active:bg-[#DCDCDC]/40",
  link: "bg-transparent",
  adminPrimary: "bg-[#B8860B] active:bg-[#9A6F09]",
  adminSecondary: "border-[1.5px] border-[#B8860B] bg-transparent active:bg-[#B8860B]/10",
  adminEdit: "bg-[#B87333] active:bg-[#9A5E28]",
  adminView: "bg-[#F5F2EC] border border-[#DCDCDC] active:bg-[#DCDCDC]/50",
  adminDanger: "bg-[#DC2626] active:bg-[#B91C1C]",
  adminNeutral: "bg-[#1C1C1C] active:bg-[#333333]",
};

const variantTextClasses: Record<ButtonVariant, string> = {
  default: "text-white font-inter-medium",
  destructive: "text-white font-inter-medium",
  outline: "text-[#B8860B] font-inter-medium",
  secondary: "text-[#B8860B] font-inter-medium",
  ghost: "text-[#1C1C1C] font-inter-medium",
  link: "text-[#B8860B] underline font-inter-medium",
  adminPrimary: "text-white font-inter-medium",
  adminSecondary: "text-[#B8860B] font-inter-medium",
  adminEdit: "text-white font-inter-medium",
  adminView: "text-[#1C1C1C] font-inter-medium",
  adminDanger: "text-white font-inter-medium",
  adminNeutral: "text-white font-inter-medium",
};

const sizeContainerClasses: Record<ButtonSize, string> = {
  default: "min-h-[48px] px-4 py-3 rounded-xl",
  sm: "min-h-[44px] px-3.5 py-2 rounded-xl",
  lg: "min-h-[52px] px-6 py-3.5 rounded-xl",
  icon: "h-12 w-12 rounded-xl p-0",
  admin: "min-h-[48px] rounded-xl px-4 py-3",
  adminCompact: "min-h-[44px] rounded-xl px-3.5 py-2",
};

const sizeTextClasses: Record<ButtonSize, string> = {
  default: "text-base",
  sm: "text-sm",
  lg: "text-base",
  icon: "text-sm",
  admin: "text-sm",
  adminCompact: "text-xs",
};

export function buttonVariants(options?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}): string {
  const v = options?.variant || "default";
  const s = options?.size || "default";
  const extra = options?.className || "";
  return `flex-row items-center justify-center gap-2 ${variantContainerClasses[v]} ${sizeContainerClasses[s]} ${extra}`.trim();
}

export interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  textClassName?: string;
  isLoading?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

export function Button({
  className = "",
  textClassName = "",
  variant = "default",
  size = "default",
  isLoading = false,
  disabled,
  onPress,
  onClick,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled || isLoading);
  const containerClass = buttonVariants({ variant, size, className });
  const textClass = `${variantTextClasses[variant]} ${sizeTextClasses[size]} ${textClassName}`.trim();

  const handlePress = (event: any) => {
    if (isDisabled) return;
    if (onPress) {
      onPress(event);
    } else if (onClick) {
      onClick();
    }
  };

  const usesOchreSpinner =
    variant === "outline" ||
    variant === "secondary" ||
    variant === "ghost" ||
    variant === "link" ||
    variant === "adminSecondary" ||
    variant === "adminView";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      onPress={handlePress}
      className={`${containerClass} ${isDisabled ? "opacity-50" : ""}`}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={usesOchreSpinner ? "#B8860B" : "#FFFFFF"}
        />
      ) : null}
      {typeof children === "string" || typeof children === "number" ? (
        <Text className={textClass}>{children}</Text>
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {children}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default Button;
