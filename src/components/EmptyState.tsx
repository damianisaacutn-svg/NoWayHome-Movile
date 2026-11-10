import { Search } from "lucide-react-native";
import React from "react";
import { Text, View, type ViewProps } from "react-native";

export interface EmptyStateProps extends ViewProps {
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  title?: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Search,
  title = "Sin resultados",
  message,
  action,
  className = "",
  ...props
}: EmptyStateProps) {
  return (
    <View
      className={`items-center justify-center rounded-2xl border border-[#6B8E23]/10 bg-white px-6 py-12 ${className}`}
      {...props}
    >
      <View className="mb-4 rounded-full bg-[#F2E8CF]/60 p-4">
        <Icon size={36} color="#A67C52" />
      </View>
      <Text className="font-poppins text-lg font-semibold text-[#5F5F5F] text-center">
        {title}
      </Text>
      {message ? (
        <Text className="mt-2 max-w-md text-center text-sm text-[#5F5F5F]/70 leading-5">
          {message}
        </Text>
      ) : null}
      {action ? <View className="mt-5 w-full items-center">{action}</View> : null}
    </View>
  );
}

export default EmptyState;
