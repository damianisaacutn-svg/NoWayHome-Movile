import React from "react";
import { TextInput, type TextInputProps } from "react-native";

export interface TextareaProps extends Omit<TextInputProps, "onChange"> {
  className?: string;
  onChange?: (event: { target: { value: string }; nativeEvent?: any }) => void;
}

export function Textarea({
  className = "",
  onChangeText,
  onChange,
  numberOfLines = 4,
  ...props
}: TextareaProps) {
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
      multiline
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      placeholderTextColor="#9CA3AF"
      onChangeText={handleChangeText}
      className={`min-h-[100px] w-full rounded-xl border border-[#6B8E23]/20 bg-white p-4 text-base text-[#5F5F5F] ${className}`}
      {...props}
    />
  );
}

export default Textarea;




