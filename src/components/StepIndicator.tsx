import { Check } from "lucide-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export interface StepIndicatorProps {
  steps: string[];
  currentStep: number; // 0-indexed
  onStepPress?: (index: number) => void;
}

export function StepIndicator({
  steps,
  currentStep,
  onStepPress,
}: StepIndicatorProps) {
  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-inter-medium text-xs uppercase tracking-wider text-[#B87333]">
          Paso {currentStep + 1} de {steps.length}
        </Text>
        <Text className="font-inter-semibold text-xs text-[#1C1C1C]">
          {steps[currentStep]}
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        {steps.map((label, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;
          const canTap = Boolean(onStepPress && idx <= currentStep);

          return (
            <TouchableOpacity
              key={label}
              disabled={!canTap}
              onPress={() => onStepPress?.(idx)}
              activeOpacity={0.8}
              className="flex-1"
            >
              <View
                className={`h-2 rounded-full ${
                  isActive
                    ? "bg-[#B8860B]"
                    : isCompleted
                      ? "bg-[#B87333]"
                      : "bg-[#DCDCDC]"
                }`}
              />
              <View className="mt-1.5 flex-row items-center gap-1">
                {isCompleted ? (
                  <Check size={11} color="#B87333" />
                ) : null}
                <Text
                  numberOfLines={1}
                  className={`font-inter-medium text-[11px] ${
                    isActive
                      ? "text-[#B8860B]"
                      : isCompleted
                        ? "text-[#B87333]"
                        : "text-[#595959]"
                  }`}
                >
                  {label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default StepIndicator;
