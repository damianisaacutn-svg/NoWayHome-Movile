import { AlertCircle } from "lucide-react-native";
import React, { useState } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

export interface InputProps extends Omit<TextInputProps, "onChange"> {
  className?: string;
  containerClassName?: string;
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  type?: "text" | "email" | "password" | "number" | "tel" | "search" | string;
  onChange?: (event: { target: { value: string }; nativeEvent?: any }) => void;
}

export function Input({
  className = "",
  containerClassName = "",
  label,
  error,
  helperText,
  leftIcon,
  rightElement,
  type = "text",
  editable = true,
  onChangeText,
  onChange,
  onFocus,
  onBlur,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const isPassword = type === "password" || Boolean(secureTextEntry);
  const resolvedKeyboardType =
    keyboardType ||
    (type === "email"
      ? "email-address"
      : type === "number"
        ? "numeric"
        : type === "tel"
          ? "phone-pad"
          : "default");

  const resolvedAutoCapitalize =
    autoCapitalize ||
    (type === "email" || isPassword ? "none" : "sentences");

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

      <View
        className={`min-h-[48px] w-full flex-row items-center rounded-xl border px-3.5 ${borderClass}`}
      >
        {leftIcon ? <View className="mr-2.5">{leftIcon}</View> : null}

        <TextInput
          editable={editable}
          secureTextEntry={isPassword}
          keyboardType={resolvedKeyboardType}
          autoCapitalize={resolvedAutoCapitalize}
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
          className={`flex-1 py-2.5 font-inter-medium text-base text-[#1C1C1C] ${className}`}
          {...props}
        />

        {rightElement ? <View className="ml-2">{rightElement}</View> : null}
      </View>

      {error ? (
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <AlertCircle size={14} color="#DC2626" />
          <Text className="flex-1 font-inter text-xs text-[#DC2626]">
            {error}
          </Text>
        </View>
      ) : helperText ? (
        <Text className="mt-1.5 font-inter text-xs text-[#595959]">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

export default Input;
