import React from "react";
import { Text, View, type TextProps, type ViewProps } from "react-native";

export interface CardProps extends ViewProps {
  className?: string;
  children?: React.ReactNode;
}

export interface CardTextProps extends TextProps {
  className?: string;
  children?: React.ReactNode;
}

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <View
      className={`bg-white flex-col gap-4 rounded-2xl border border-[#6B8E23]/15 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({ className = "", children, ...props }: CardProps) {
  return (
    <View className={`flex-col gap-1.5 px-6 pt-6 ${className}`} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({
  className = "",
  children,
  ...props
}: CardTextProps) {
  return (
    <Text
      className={`font-poppins text-lg font-semibold text-[#5F5F5F] ${className}`}
      {...props}
    >
      {children}
    </Text>
  );
}

export function CardDescription({
  className = "",
  children,
  ...props
}: CardTextProps) {
  return (
    <Text className={`text-sm text-[#5F5F5F]/75 ${className}`} {...props}>
      {children}
    </Text>
  );
}

export function CardAction({ className = "", children, ...props }: CardProps) {
  return (
    <View className={`self-end ${className}`} {...props}>
      {children}
    </View>
  );
}

export function CardContent({ className = "", children, ...props }: CardProps) {
  return (
    <View className={`px-6 pb-6 ${className}`} {...props}>
      {children}
    </View>
  );
}

export function CardFooter({ className = "", children, ...props }: CardProps) {
  return (
    <View className={`flex-row items-center px-6 pb-6 ${className}`} {...props}>
      {children}
    </View>
  );
}

export default Card;
