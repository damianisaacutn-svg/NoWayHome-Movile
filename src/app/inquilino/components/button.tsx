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
  default: "bg-[#6B8E23] active:bg-[#5a7a1d]",
  destructive: "bg-red-600 active:bg-red-700",
  outline: "border border-[#6B8E23]/30 bg-white active:bg-[#F2E8CF]/40",
  secondary: "bg-[#A67C52] active:bg-[#8f6844]",
  ghost: "bg-transparent active:bg-[#F2E8CF]/50",
  link: "bg-transparent",
  adminPrimary: "bg-[#6B8E23] active:bg-[#5a7a1d]",
  adminSecondary: "border-[1.5px] border-[#6B8E23] bg-transparent active:bg-[#F2E8CF]",
  adminEdit: "bg-[#A67C52] active:bg-[#8f6844]",
  adminView: "bg-[#F2E8CF] active:bg-[#e8d7b6]",
  adminDanger: "bg-[#B42318] active:bg-[#912018]",
  adminNeutral: "bg-[#5F5F5F] active:bg-[#4f4f4f]",
};

const variantTextClasses: Record<ButtonVariant, string> = {
  default: "text-white font-semibold",
  destructive: "text-white font-semibold",
  outline: "text-[#5F5F5F] font-medium",
  secondary: "text-white font-semibold",
  ghost: "text-[#5F5F5F] font-medium",
  link: "text-[#6B8E23] underline font-medium",
  adminPrimary: "text-white font-semibold",
  adminSecondary: "text-[#6B8E23] font-semibold",
  adminEdit: "text-white font-semibold",
  adminView: "text-[#5F5F5F] font-medium",
  adminDanger: "text-white font-semibold",
  adminNeutral: "text-white font-semibold",
};

const sizeContainerClasses: Record<ButtonSize, string> = {
  default: "min-h-[40px] px-4 py-2.5 rounded-xl",
  sm: "min-h-[34px] px-3 py-1.5 rounded-lg",
  lg: "min-h-[48px] px-6 py-3 rounded-xl",
  icon: "h-10 w-10 rounded-xl p-0",
  admin: "min-h-[44px] rounded-xl px-4 py-3",
  adminCompact: "min-h-[36px] rounded-lg px-3 py-1.5",
};

const sizeTextClasses: Record<ButtonSize, string> = {
  default: "text-sm",
  sm: "text-xs",
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
          color={
            variant === "outline" ||
            variant === "ghost" ||
            variant === "adminSecondary" ||
            variant === "adminView"
              ? "#6B8E23"
              : "#FFFFFF"
          }
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
