import * as Linking from "expo-linking";
import { ExternalLink, MapPin, Navigation } from "lucide-react-native";
import React, { useState } from "react";
import {
  StyleProp,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

const DEFAULT_CENTER = {
  latitude: 19.4326,
  longitude: -99.1332,
};

function toCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export interface PropertyLocationMapProps {
  latitud?: number | string | null;
  longitud?: number | string | null;
  direccion?: string | null;
  editable?: boolean;
  onChange?: (coords: { latitud: number; longitud: number }) => void;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function PropertyLocationMap({
  latitud,
  longitud,
  direccion,
  editable = false,
  onChange,
  style,
  className = "",
}: PropertyLocationMapProps) {
  const latitude = toCoordinate(latitud);
  const longitude = toCoordinate(longitud);
  const hasCoordinates = latitude !== null && longitude !== null;

  const [latDraft, setLatDraft] = useState<string | null>(null);
  const [lngDraft, setLngDraft] = useState<string | null>(null);

  const latInput = latDraft ?? (latitude !== null ? String(latitude) : "");
  const lngInput = lngDraft ?? (longitude !== null ? String(longitude) : "");

  const displayLat = latitude ?? DEFAULT_CENTER.latitude;
  const displayLng = longitude ?? DEFAULT_CENTER.longitude;

  const handleOpenExternalMap = () => {
    const query = hasCoordinates
      ? `${latitude},${longitude}`
      : direccion
        ? encodeURIComponent(direccion)
        : `${DEFAULT_CENTER.latitude},${DEFAULT_CENTER.longitude}`;

    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    void Linking.openURL(url);
  };

  const handleLatTextChange = (nextLatStr: string) => {
    setLatDraft(nextLatStr);
    if (!editable || !onChange) return;

    const parsedLat = toCoordinate(nextLatStr);
    const parsedLng = toCoordinate(lngInput);
    if (parsedLat !== null && parsedLng !== null) {
      onChange({
        latitud: Number(parsedLat.toFixed(8)),
        longitud: Number(parsedLng.toFixed(8)),
      });
    } else if (parsedLat !== null && longitude === null && lngInput === "") {
      onChange({
        latitud: Number(parsedLat.toFixed(8)),
        longitud: DEFAULT_CENTER.longitude,
      });
    }
  };

  const handleLngTextChange = (nextLngStr: string) => {
    setLngDraft(nextLngStr);
    if (!editable || !onChange) return;

    const parsedLat = toCoordinate(latInput);
    const parsedLng = toCoordinate(nextLngStr);
    if (parsedLat !== null && parsedLng !== null) {
      onChange({
        latitud: Number(parsedLat.toFixed(8)),
        longitud: Number(parsedLng.toFixed(8)),
      });
    } else if (parsedLng !== null && latitude === null && latInput === "") {
      onChange({
        latitud: DEFAULT_CENTER.latitude,
        longitud: Number(parsedLng.toFixed(8)),
      });
    }
  };

  if (!editable && !hasCoordinates && !direccion) {
    return (
      <View
        className={`min-h-[200px] flex-1 items-center justify-center rounded-xl border border-[#DCDCDC] bg-[#F5F2EC] p-4 ${className}`}
        style={style}
      >
        <View className="flex-col items-center gap-2">
          <MapPin size={28} color="#B87333" />
          <Text className="font-inter-medium text-[#1C1C1C] text-center">
            Ubicación no disponible
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      className={`min-h-[200px] rounded-xl overflow-hidden border border-[#DCDCDC] bg-[#F5F2EC] p-5 justify-between ${className}`}
      style={style}
    >
      <View className="items-center justify-center flex-1 py-2">
        <View className="h-14 w-14 rounded-full bg-[#B8860B]/15 items-center justify-center mb-2 border border-[#B8860B]/30">
          <View className="h-10 w-10 rounded-full bg-[#B8860B] items-center justify-center shadow-sm">
            <MapPin size={20} color="#FFFFFF" />
          </View>
        </View>

        {direccion ? (
          <Text
            className="font-inter-semibold text-sm text-[#1C1C1C] text-center px-2 mb-1"
            numberOfLines={2}
          >
            {direccion}
          </Text>
        ) : null}

        {hasCoordinates ? (
          <View className="flex-row items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-[#DCDCDC] mt-1">
            <Navigation size={12} color="#B87333" />
            <Text className="font-inter-medium text-xs text-[#1C1C1C]">
              {displayLat.toFixed(5)}, {displayLng.toFixed(5)}
            </Text>
          </View>
        ) : (
          <Text className="font-inter text-xs text-[#595959] text-center mt-1">
            Mapa interactivo disponible en Google Maps
          </Text>
        )}
      </View>

      {editable ? (
        <View className="flex-row gap-2 mt-3">
          <View className="flex-1">
            <Text className="font-inter-medium text-[11px] text-[#595959] mb-1">
              Latitud
            </Text>
            <TextInput
              value={latInput}
              onChangeText={handleLatTextChange}
              onBlur={() => setLatDraft(null)}
              keyboardType="numeric"
              placeholder={String(DEFAULT_CENTER.latitude)}
              placeholderTextColor="#7A7A7A"
              className="h-11 rounded-xl border border-[#DCDCDC] bg-[#FAFAFA] px-3 text-xs text-[#1C1C1C]"
            />
          </View>
          <View className="flex-1">
            <Text className="font-inter-medium text-[11px] text-[#595959] mb-1">
              Longitud
            </Text>
            <TextInput
              value={lngInput}
              onChangeText={handleLngTextChange}
              onBlur={() => setLngDraft(null)}
              keyboardType="numeric"
              placeholder={String(DEFAULT_CENTER.longitude)}
              placeholderTextColor="#7A7A7A"
              className="h-11 rounded-xl border border-[#DCDCDC] bg-[#FAFAFA] px-3 text-xs text-[#1C1C1C]"
            />
          </View>
        </View>
      ) : null}

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleOpenExternalMap}
        className="mt-3 min-h-[44px] flex-row items-center justify-center gap-2 rounded-xl bg-white py-2.5 px-4 border-[1.5px] border-[#B8860B] shadow-sm"
      >
        <ExternalLink size={16} color="#B8860B" />
        <Text className="font-inter-medium text-xs text-[#B8860B]">
          Ver ubicación en Google Maps
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default PropertyLocationMap;
