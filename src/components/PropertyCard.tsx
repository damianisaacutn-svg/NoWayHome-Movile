import { Heart, MapPin, Star, Users } from "lucide-react-native";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

export interface PropertyCardProps {
  title: string;
  location: string;
  imageUri: string;
  priceFormatted: string;
  priceSuffix?: string;
  rating?: string | number;
  capacity?: number | string | null;
  actionLabel?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onPress: () => void;
  onImageError?: () => void;
}

export function PropertyCard({
  title,
  location,
  imageUri,
  priceFormatted,
  priceSuffix = "/ noche",
  rating = "4.9",
  capacity,
  actionLabel = "Ver detalles",
  isFavorite,
  onToggleFavorite,
  onPress,
  onImageError,
}: PropertyCardProps) {
  const numericCapacity = Number(capacity || 0);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      className="flex-col overflow-hidden rounded-2xl bg-white border border-[#DCDCDC] shadow-sm"
    >
      <View className="relative h-56 w-full bg-[#F5F2EC]">
        <Image
          source={{ uri: imageUri }}
          className="h-full w-full"
          resizeMode="cover"
          onError={onImageError}
        />

        {/* Badge de calificación */}
        <View className="absolute top-3 left-3 flex-row items-center rounded-full bg-white/95 px-2.5 py-1 border border-[#DCDCDC] shadow-sm">
          <Star size={14} color="#B8860B" fill="#B8860B" />
          <Text className="ml-1 font-inter-semibold text-xs text-[#1C1C1C]">
            {rating}
          </Text>
        </View>

        {/* Acción de favorito */}
        {onToggleFavorite ? (
          <TouchableOpacity
            onPress={onToggleFavorite}
            accessibilityLabel={
              isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"
            }
            className="absolute right-3 top-3 h-11 w-11 items-center justify-center rounded-full bg-white/95 border border-[#DCDCDC] shadow-sm"
          >
            <Heart
              size={20}
              color={isFavorite ? "#B8860B" : "#B87333"}
              fill={isFavorite ? "#B8860B" : "transparent"}
            />
          </TouchableOpacity>
        ) : null}

        {/* Capacidad */}
        {numericCapacity > 0 ? (
          <View className="absolute bottom-3 left-3 flex-row items-center rounded-full bg-[#1C1C1C]/75 px-3 py-1">
            <Users size={13} color="#FFFFFF" />
            <Text className="ml-1.5 font-inter-medium text-xs text-white">
              Hasta {numericCapacity} huésp.
            </Text>
          </View>
        ) : null}
      </View>

      <View className="p-5">
        <Text
          className="font-poppins text-lg font-semibold leading-6 text-[#1C1C1C] mb-1.5"
          numberOfLines={2}
        >
          {title}
        </Text>

        <View className="flex-row items-center mb-4">
          <MapPin size={16} color="#B87333" />
          <Text
            className="ml-1.5 flex-1 font-inter text-sm text-[#595959]"
            numberOfLines={1}
          >
            {location}
          </Text>
        </View>

        <View className="border-t border-[#DCDCDC] pt-3.5 flex-row items-center justify-between gap-3">
          <View className="flex-row items-baseline flex-shrink">
            <Text className="font-poppins text-xl font-semibold text-[#B8860B]">
              {priceFormatted}
            </Text>
            <Text className="ml-1 font-inter text-xs text-[#595959]">
              {priceSuffix}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPress}
            className="min-h-[44px] rounded-xl bg-[#B8860B] px-4 py-2.5 items-center justify-center"
          >
            <Text className="font-inter-medium text-sm text-white">
              {actionLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default PropertyCard;
