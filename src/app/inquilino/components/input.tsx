import React from "react";
import { TextInput, type TextInputProps } from "react-native";

export interface InputProps extends Omit<TextInputProps, "onChange"> {
  className?: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "search" | string;
  onChange?: (event: { target: { value: string }; nativeEvent?: any }) => void;
}

export function Input({
  className = "",
  type = "text",
  onChangeText,
  onChange,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  ...props
}: InputProps) {
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

  return (
    <TextInput
      secureTextEntry={isPassword}
      keyboardType={resolvedKeyboardType}
      autoCapitalize={resolvedAutoCapitalize}
      placeholderTextColor="#9CA3AF"
      onChangeText={handleChangeText}
      className={`h-12 w-full rounded-xl border border-[#6B8E23]/20 bg-white px-4 py-2 text-base text-[#5F5F5F] ${className}`}
      {...props}
    />
  );
}

export default Input;
