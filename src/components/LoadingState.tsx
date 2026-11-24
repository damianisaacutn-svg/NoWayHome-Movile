import React from "react";
import { ActivityIndicator, Text, View, type ViewProps } from "react-native";

export interface LoadingStateProps extends ViewProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = "Cargando...",
  className = "",
  ...props
}: LoadingStateProps) {
  return (
    <View
      className={`min-h-[220px] flex-col items-center justify-center p-6 ${className}`}
      {...props}
    >
      <ActivityIndicator size="large" color="#B8860B" />
      <Text className="mt-4 font-inter-medium text-[#1C1C1C] text-center">
        {message}
      </Text>
    </View>
  );
}

export default LoadingState;
