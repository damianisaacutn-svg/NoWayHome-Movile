import { AlertCircle } from "lucide-react-native";
import React, { useState } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

export interface TextareaProps extends Omit<TextInputProps, "onChange"> {
  className?: string;
  containerClassName?: string;
  label?: string;
  error?: string;
  onChange?: (event: { target: { value: string }; nativeEvent?: any }) => void;
}

export function Textarea({
  className = "",
  containerClassName = "",
  label,
  error,
  editable = true,
  onChangeText,
  onChange,
  onFocus,
  onBlur,
  numberOfLines = 4,
  ...props
}: TextareaProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChangeText = (text: string) => {
    if (onChangeText) {
      onChangeText(text);
    }
    if (onChange) {
      onChange({ target: { value: text } });
    }
  };

  const borderClass = !editable
    ? "border-[#DCDCDC] bg-[#DCDCDC]/35 opacity-75"
    : error
      ? "border-[#DC2626] bg-[#FAFAFA]"
      : isFocused
        ? "border-[#B8860B] bg-white"
        : "border-[#DCDCDC] bg-[#FAFAFA]";

  return (
    <View className={`w-full ${containerClassName}`}>
      {label ? (
        <Text className="font-inter-medium text-sm text-[#1C1C1C] mb-1.5">
          {label}
        </Text>
      ) : null}

      <TextInput
        multiline
        editable={editable}
        numberOfLines={numberOfLines}
        textAlignVertical="top"
        placeholderTextColor="#7A7A7A"
        onChangeText={handleChangeText}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        className={`min-h-[104px] w-full rounded-xl border p-4 font-inter text-base text-[#1C1C1C] ${borderClass} ${className}`}
        {...props}
      />

      {error ? (
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <AlertCircle size={14} color="#DC2626" />
          <Text className="flex-1 font-inter text-xs text-[#DC2626]">
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default Textarea;
