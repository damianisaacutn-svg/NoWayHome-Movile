// src/screens/CrearPropiedadScreen.tsx
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Home,
  ImagePlus,
  Search,
  Trash2,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { authService } from "@/services/authService";
import {
  getLandlordId,
  getStoredSessionUser,
  resolveUserRole,
  type SessionUserLike,
} from "@/utils/sessionRole";
import { HeaderArrendatario } from "../../components/headerArrendatario";
import { PropertyLocationMap } from "../../components/locacionPropiedadMap";
import { geocodeAddress } from "../../services/geocodeService";
import { createProperty } from "../../services/propertyService";

// ---------------------------------------------------------------------------
// TIPOS E INTERFACES
// ---------------------------------------------------------------------------

export interface PropertyFormState {
  titulo: string;
  descripcion: string;
  direccion: string;
  ciudad: string;
  pais: string;
  tipo_precio: "noche" | "mensual";
  precio_por_noche: string;
  capacidad: string;
  numero_habitaciones: string;
  numero_banos: string;
  latitud: string;
  longitud: string;
}

export interface SelectedImage {
  id: string;
  uri: string;
  name: string;
  type: string;
  size?: number;
  file?: File;
}

export interface UserData {
  id?: string | number;
  id_arrendatario?: string | number;
  role?: string;
  rol?: string;
  [key: string]: unknown;
}

export interface GeocodeState {
  isLoading: boolean;
  type: "success" | "error" | "";
  message: string;
}

export interface ActionModalState {
  open: boolean;
  type: "success" | "error" | "";
  title: string;
  description: string;
}

export interface FormErrors {
  titulo?: string;
  descripcion?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
  tipo_precio?: string;
  precio_por_noche?: string;
  capacidad?: string;
  numero_habitaciones?: string;
  numero_banos?: string;
  latitud?: string;
  longitud?: string;
  imagenes?: string;
  form?: string;
}

// ---------------------------------------------------------------------------
// CONSTANTES Y UTILIDADES
// ---------------------------------------------------------------------------

const initialForm: PropertyFormState = {
  titulo: "",
  descripcion: "",
  direccion: "",
  ciudad: "",
  pais: "",
  tipo_precio: "noche",
  precio_por_noche: "",
  capacidad: "",
  numero_habitaciones: "",
  numero_banos: "",
  latitud: "",
  longitud: "",
};

const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024; // 5 MB
const allowedPriceTypes = ["noche", "mensual"];
const locationFoundMessage =
  "Ubicación encontrada. Puedes ajustar el marcador antes de guardar.";
const locationNotFoundMessage =
  "No se encontró una ubicación para esa dirección. Intenta ser más específico.";
const locationSearchFailedMessage =
  "No pudimos buscar la ubicación en este momento. Intenta nuevamente.";

function isValidOptionalCoordinate(
  value: string | number | null | undefined,
  min: number,
  max: number,
): boolean {
  if (value === null || value === undefined || value === "") return true;
  const numberValue = Number(value);
  return (
    Number.isFinite(numberValue) && numberValue >= min && numberValue <= max
  );
}

function normalizeOptionalNumber(value: string): string {
  return value === "" ? "" : String(Number(value));
}

async function appendImageToFormData(
  formData: FormData,
  fieldName: string,
  image: SelectedImage,
) {
  if (Platform.OS === "web") {
    if (image.file) {
      formData.append(fieldName, image.file, image.name);
      return;
    }
    const response = await fetch(image.uri);
    const blob = await response.blob();
    formData.append(fieldName, blob, image.name);
    return;
  }

  formData.append(fieldName, {
    uri: image.uri,
    name: image.name,
    type: image.type,
  } as unknown as Blob);
}

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------------------------

export function CrearPropiedad() {
  const router = useRouter();

  const [userData, setUserData] = useState<SessionUserLike | null>(() =>
    getStoredSessionUser(),
  );
  const [form, setForm] = useState<PropertyFormState>(initialForm);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [geocodeState, setGeocodeState] = useState<GeocodeState>({
    isLoading: false,
    type: "",
    message: "",
  });

  const [actionMessage, setActionMessage] = useState<ActionModalState>({
    open: false,
    type: "",
    title: "",
    description: "",
  });

  const idArrendatario = useMemo(() => {
    return getLandlordId(userData, authService.getSession()?.role);
  }, [userData]);

  const canView = useMemo(() => {
    if (!userData) return false;
    return (
      resolveUserRole(userData, authService.getSession()?.role) ===
        "arrendatario" || Boolean(userData?.id_arrendatario)
    );
  }, [userData]);

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextSession) => {
      if (!nextSession?.isAuthenticated) {
        setUserData(null);
        return;
      }
      setUserData(getStoredSessionUser());
    });
    return unsubscribe;
  }, []);

  // Verificación de sesión y rol con authService
  useEffect(() => {
    if (!userData) {
      router.replace("/loginPage" as any);
      return;
    }

    if (!canView) {
      router.replace("/inquilino/profileInquilino" as any);
    }
  }, [userData, canView, router]);

  const showActionMessage = (
    type: "success" | "error",
    description: string,
    title?: string,
  ) => {
    setActionMessage({
      open: true,
      type,
      title: title || (type === "success" ? "Acción completada" : "Error"),
      description,
    });
  };

  const handleFieldChange = (name: keyof PropertyFormState, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const handleLocationChange = (coordinates: {
    latitud: number | string;
    longitud: number | string;
  }) => {
    setForm((current) => ({
      ...current,
      latitud: String(coordinates.latitud),
      longitud: String(coordinates.longitud),
    }));
    setErrors((current) => ({ ...current, latitud: "", longitud: "" }));
    setGeocodeState({ isLoading: false, type: "", message: "" });
  };

  const buildSearchAddress = (): string => {
    return [form.direccion, form.ciudad, form.pais]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(", ");
  };

  const handleSearchLocation = async () => {
    const address = buildSearchAddress();

    if (!address) {
      setGeocodeState({
        isLoading: false,
        type: "error",
        message: "Escribe una dirección para buscar la ubicación.",
      });
      return;
    }

    try {
      setGeocodeState({ isLoading: true, type: "", message: "" });
      const location = await geocodeAddress(address);
      setForm((current) => ({
        ...current,
        latitud: String(location.latitud),
        longitud: String(location.longitud),
      }));
      setErrors((current) => ({ ...current, latitud: "", longitud: "" }));
      setGeocodeState({
        isLoading: false,
        type: "success",
        message: locationFoundMessage,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "";
      const isNotFound = errorMessage.toLowerCase().includes("no se encontro");
      setGeocodeState({
        isLoading: false,
        type: "error",
        message: isNotFound
          ? locationNotFoundMessage
          : locationSearchFailedMessage,
      });
    }
  };

  const validateImageFiles = (
    nextFiles: ImagePicker.ImagePickerAsset[],
  ): string => {
    if (images.length + nextFiles.length > 20) {
      return "Solo puedes subir un máximo de 20 fotografías.";
    }

    const hasInvalidType = nextFiles.some((file) => {
      if (!file.mimeType) return false;
      return !acceptedImageTypes.includes(file.mimeType);
    });

    if (hasInvalidType) {
      return "Solo se permiten imágenes JPG, PNG o WEBP.";
    }

    const hasOversizedFile = nextFiles.some(
      (file) => (file.fileSize || 0) > maxImageSize,
    );
    if (hasOversizedFile) {
      return "Cada imagen debe pesar máximo 5 MB.";
    }

    return "";
  };

  const handleSelectImages = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setErrors((current) => ({
          ...current,
          imagenes: "Se requiere permiso para acceder a la galería.",
        }));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 20 - images.length,
      });

      if (result.canceled || !result.assets || result.assets.length === 0)
        return;

      const imageError = validateImageFiles(result.assets);
      if (imageError) {
        setErrors((current) => ({ ...current, imagenes: imageError }));
        return;
      }

      const timestamp = Date.now();
      const nextImages: SelectedImage[] = result.assets.map((asset, index) => {
        const fallbackName = `imagen_${timestamp}_${index}.jpg`;
        return {
          id: `${asset.fileName || fallbackName}-${timestamp}-${index}`,
          uri: asset.uri,
          name: asset.fileName || fallbackName,
          type: asset.mimeType || "image/jpeg",
          size: asset.fileSize,
          file: (asset as ImagePicker.ImagePickerAsset & { file?: File }).file,
        };
      });

      setImages((current) => [...current, ...nextImages]);
      setErrors((current) => ({ ...current, imagenes: "" }));
    } catch {
      setErrors((current) => ({
        ...current,
        imagenes: "No se pudieron cargar las fotos seleccionadas.",
      }));
    }
  };

  const removeImage = (imageId: string) => {
    setImages((current) => current.filter((image) => image.id !== imageId));
    setErrors((current) => ({ ...current, imagenes: "" }));
  };

  const validateForm = (): FormErrors => {
    const nextErrors: FormErrors = {};

    if (!form.titulo.trim()) nextErrors.titulo = "El título es obligatorio.";
    if (!form.descripcion.trim())
      nextErrors.descripcion = "La descripción es obligatoria.";
    if (!form.direccion.trim())
      nextErrors.direccion = "La dirección es obligatoria.";
    if (!form.ciudad.trim()) nextErrors.ciudad = "La ciudad es obligatoria.";
    if (!form.pais.trim()) nextErrors.pais = "El país es obligatorio.";

    if (!isValidOptionalCoordinate(form.latitud, -90, 90)) {
      nextErrors.latitud = "La latitud debe estar entre -90 y 90.";
    }
    if (!isValidOptionalCoordinate(form.longitud, -180, 180)) {
      nextErrors.longitud = "La longitud debe estar entre -180 y 180.";
    }
    if (!allowedPriceTypes.includes(form.tipo_precio)) {
      nextErrors.tipo_precio = "El tipo de precio no es válido.";
    }
    if (Number(form.precio_por_noche) <= 0) {
      nextErrors.precio_por_noche =
        form.tipo_precio === "mensual"
          ? "El precio mensual debe ser mayor a 0."
          : "El precio por noche debe ser mayor a 0.";
    }
    if (form.capacidad !== "" && Number(form.capacidad) <= 0) {
      nextErrors.capacidad = "La capacidad debe ser mayor a 0.";
    }
    if (
      form.numero_habitaciones !== "" &&
      (!Number.isInteger(Number(form.numero_habitaciones)) ||
        Number(form.numero_habitaciones) < 0)
    ) {
      nextErrors.numero_habitaciones =
        "El número de habitaciones debe ser mayor o igual a 0.";
    }
    if (
      form.numero_banos !== "" &&
      (!Number.isInteger(Number(form.numero_banos)) ||
        Number(form.numero_banos) < 0)
    ) {
      nextErrors.numero_banos =
        "El número de baños debe ser mayor o igual a 0.";
    }
    if (!idArrendatario) {
      nextErrors.form = "No se pudo identificar al arrendatario actual.";
    }
    if (images.length < 5) {
      nextErrors.imagenes =
        "Debes subir al menos 5 fotografías de la propiedad.";
    }
    if (images.length > 20) {
      nextErrors.imagenes = "Solo puedes subir un máximo de 20 fotografías.";
    }

    return nextErrors;
  };

  const handleSubmit = async () => {
    setIsSuccess(false);

    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) return;

    const propertyFormData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (
        key === "capacidad" ||
        key === "numero_habitaciones" ||
        key === "numero_banos"
      ) {
        propertyFormData.append(key, normalizeOptionalNumber(value));
        return;
      }
      propertyFormData.append(key, value);
    });

    propertyFormData.append("id_arrendatario", String(idArrendatario));

    try {
      setIsSubmitting(true);
      for (const image of images) {
        await appendImageToFormData(propertyFormData, "imagenes", image);
      }
      await createProperty(propertyFormData);
      setForm(initialForm);
      setImages([]);
      setErrors({});
      setIsSuccess(true);
      showActionMessage("success", "Propiedad registrada correctamente.");
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "No se pudo registrar la propiedad.";
      showActionMessage("error", msg);
      setIsSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderError = (field: keyof FormErrors) => {
    if (!errors[field]) return null;
    return <Text className="mt-1 text-sm text-red-700">{errors[field]}</Text>;
  };

  if (!canView) return null;

  const priceLabel =
    form.tipo_precio === "mensual" ? "Precio mensual" : "Precio por noche";
  const priceHelpText =
    form.tipo_precio === "mensual"
      ? "Este será el precio para estancias mensuales."
      : "Este será el precio que pagará el huésped por cada noche de estancia.";

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top"]}>
      <StatusBar style="dark" />
      <HeaderArrendatario />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1 px-4 py-6"
      >
        <View className="w-full max-w-4xl mx-auto">
          {/* Botón Volver */}
          <TouchableOpacity
            onPress={() =>
              router.push("/arrendatario/profileArrendatario" as any)
            }
            className="flex-row items-center mb-5 self-start py-2 px-3 rounded-xl bg-transparent active:bg-[#6B8E23]/10"
          >
            <ArrowLeft size={16} color="#6B8E23" />
            <Text className="ml-2 font-medium text-[#6B8E23]">
              Volver al perfil
            </Text>
          </TouchableOpacity>

          {/* Tarjeta Contenedora Principal */}
          <View className="bg-[#F2E8CF] rounded-2xl p-6">
            <View className="mb-6">
              <View className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                <Home size={24} color="#6B8E23" />
              </View>
              <Text className="text-2xl font-bold text-[#5F5F5F]">
                Agregar propiedad
              </Text>
              <Text className="mt-2 text-sm text-[#5F5F5F]/80">
                Completa la información de tu alojamiento para publicarlo en
                NoWayHome.
              </Text>
            </View>

            {/* SECCIÓN: Información Básica */}
            <View className="mb-8">
              <Text className="text-lg font-bold text-[#5F5F5F] mb-4">
                Información básica
              </Text>

              <View className="mb-4">
                <Text className="text-[#5F5F5F] font-medium mb-1">Título</Text>
                <TextInput
                  value={form.titulo}
                  onChangeText={(val) => handleFieldChange("titulo", val)}
                  placeholder="Ej. Casa acogedora cerca del centro"
                  placeholderTextColor="#5F5F5F60"
                  className="h-12 bg-white border border-[#6B8E23]/20 text-[#5F5F5F] px-4 rounded-xl"
                />
                {renderError("titulo")}
              </View>

              <View className="mb-4">
                <Text className="text-[#5F5F5F] font-medium mb-1">
                  Descripción
                </Text>
                <TextInput
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={form.descripcion}
                  onChangeText={(val) => handleFieldChange("descripcion", val)}
                  placeholder="Describe las comodidades, reglas y atractivos del lugar..."
                  placeholderTextColor="#5F5F5F60"
                  className="min-h-[100px] bg-white border border-[#6B8E23]/20 text-[#5F5F5F] p-4 rounded-xl"
                />
                {renderError("descripcion")}
              </View>
            </View>

            {/* SECCIÓN: Ubicación */}
            <View className="mb-8">
              <Text className="text-lg font-bold text-[#5F5F5F] mb-4">
                Ubicación
              </Text>

              <View className="mb-4">
                <Text className="text-[#5F5F5F] font-medium mb-1">
                  Dirección
                </Text>
                <TextInput
                  value={form.direccion}
                  onChangeText={(val) => handleFieldChange("direccion", val)}
                  placeholder="Calle, número exterior/interior"
                  placeholderTextColor="#5F5F5F60"
                  className="h-12 bg-white border border-[#6B8E23]/20 text-[#5F5F5F] px-4 rounded-xl"
                />
                {renderError("direccion")}
              </View>

              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-[#5F5F5F] font-medium mb-1">
                    Ciudad
                  </Text>
                  <TextInput
                    value={form.ciudad}
                    onChangeText={(val) => handleFieldChange("ciudad", val)}
                    placeholder="Ciudad"
                    placeholderTextColor="#5F5F5F60"
                    className="h-12 bg-white border border-[#6B8E23]/20 text-[#5F5F5F] px-4 rounded-xl"
                  />
                  {renderError("ciudad")}
                </View>

                <View className="flex-1">
                  <Text className="text-[#5F5F5F] font-medium mb-1">País</Text>
                  <TextInput
                    value={form.pais}
                    onChangeText={(val) => handleFieldChange("pais", val)}
                    placeholder="País"
                    placeholderTextColor="#5F5F5F60"
                    className="h-12 bg-white border border-[#6B8E23]/20 text-[#5F5F5F] px-4 rounded-xl"
                  />
                  {renderError("pais")}
                </View>
              </View>

              {/* Botón Buscar Ubicación */}
              <TouchableOpacity
                onPress={handleSearchLocation}
                disabled={geocodeState.isLoading}
                className="flex-row items-center justify-center bg-[#6B8E23] h-12 rounded-xl mb-4 px-4"
              >
                {geocodeState.isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Search size={16} color="#fff" />
                    <Text className="ml-2 text-white font-medium">
                      Buscar ubicación
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {geocodeState.message ? (
                <View
                  className={`p-3 rounded-xl mb-4 flex-row items-center border ${
                    geocodeState.type === "success"
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  {geocodeState.type === "success" ? (
                    <CheckCircle2 size={16} color="#15803d" />
                  ) : (
                    <AlertCircle size={16} color="#b91c1c" />
                  )}
                  <Text
                    className={`ml-2 text-xs flex-1 ${
                      geocodeState.type === "success"
                        ? "text-green-800"
                        : "text-red-800"
                    }`}
                  >
                    {geocodeState.message}
                  </Text>
                </View>
              ) : null}

              {/* Mapa */}
              <View className="mb-4">
                <Text className="text-[#5F5F5F] font-medium mb-1">
                  Mapa de ubicación
                </Text>
                <PropertyLocationMap
                  editable
                  latitud={form.latitud}
                  longitud={form.longitud}
                  direccion={[form.direccion, form.ciudad, form.pais]
                    .map((value) => value.trim())
                    .filter(Boolean)
                    .join(", ")}
                  onChange={handleLocationChange}
                />
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-[#5F5F5F] font-medium mb-1">
                    Latitud
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    value={form.latitud}
                    onChangeText={(val) => handleFieldChange("latitud", val)}
                    placeholder="0.000000"
                    placeholderTextColor="#5F5F5F60"
                    className="h-12 bg-white border border-[#6B8E23]/20 text-[#5F5F5F] px-4 rounded-xl"
                  />
                  {renderError("latitud")}
                </View>

                <View className="flex-1">
                  <Text className="text-[#5F5F5F] font-medium mb-1">
                    Longitud
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    value={form.longitud}
                    onChangeText={(val) => handleFieldChange("longitud", val)}
                    placeholder="0.000000"
                    placeholderTextColor="#5F5F5F60"
                    className="h-12 bg-white border border-[#6B8E23]/20 text-[#5F5F5F] px-4 rounded-xl"
                  />
                  {renderError("longitud")}
                </View>
              </View>
            </View>

            {/* SECCIÓN: Capacidad y Precio */}
            <View className="mb-8">
              <Text className="text-lg font-bold text-[#5F5F5F] mb-4">
                Capacidad y precio
              </Text>

              {/* Selector de Tipo de Precio */}
              <View className="mb-4">
                <Text className="text-[#5F5F5F] font-medium mb-2">
                  Tipo de precio
                </Text>
                <View className="flex-row bg-white p-1 rounded-xl border border-[#6B8E23]/20">
                  <TouchableOpacity
                    onPress={() => handleFieldChange("tipo_precio", "noche")}
                    className={`flex-1 py-2.5 rounded-lg items-center ${
                      form.tipo_precio === "noche"
                        ? "bg-[#6B8E23]"
                        : "bg-transparent"
                    }`}
                  >
                    <Text
                      className={`font-medium ${
                        form.tipo_precio === "noche"
                          ? "text-white"
                          : "text-[#5F5F5F]"
                      }`}
                    >
                      Por noche
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleFieldChange("tipo_precio", "mensual")}
                    className={`flex-1 py-2.5 rounded-lg items-center ${
                      form.tipo_precio === "mensual"
                        ? "bg-[#6B8E23]"
                        : "bg-transparent"
                    }`}
                  >
                    <Text
                      className={`font-medium ${
                        form.tipo_precio === "mensual"
                          ? "text-white"
                          : "text-[#5F5F5F]"
                      }`}
                    >
                      Mensual
                    </Text>
                  </TouchableOpacity>
                </View>
                {renderError("tipo_precio")}
              </View>

              <View className="mb-4">
                <Text className="text-[#5F5F5F] font-medium mb-1">
                  {priceLabel}
                </Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={form.precio_por_noche}
                  onChangeText={(val) =>
                    handleFieldChange("precio_por_noche", val)
                  }
                  placeholder="0.00"
                  placeholderTextColor="#5F5F5F60"
                  className="h-12 bg-white border border-[#6B8E23]/20 text-[#5F5F5F] px-4 rounded-xl"
                />
                <Text className="mt-1 text-xs text-[#5F5F5F]/70">
                  {priceHelpText}
                </Text>
                {renderError("precio_por_noche")}
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-[#5F5F5F] font-medium mb-1">
                    Capacidad
                  </Text>
                  <TextInput
                    keyboardType="number-pad"
                    value={form.capacidad}
                    onChangeText={(val) => handleFieldChange("capacidad", val)}
                    placeholder="Ej. 4"
                    placeholderTextColor="#5F5F5F60"
                    className="h-12 bg-white border border-[#6B8E23]/20 text-[#5F5F5F] px-4 rounded-xl"
                  />
                  {renderError("capacidad")}
                </View>

                <View className="flex-1">
                  <Text className="text-[#5F5F5F] font-medium mb-1">
                    Habitaciones
                  </Text>
                  <TextInput
                    keyboardType="number-pad"
                    value={form.numero_habitaciones}
                    onChangeText={(val) =>
                      handleFieldChange("numero_habitaciones", val)
                    }
                    placeholder="Ej. 2"
                    placeholderTextColor="#5F5F5F60"
                    className="h-12 bg-white border border-[#6B8E23]/20 text-[#5F5F5F] px-4 rounded-xl"
                  />
                  {renderError("numero_habitaciones")}
                </View>

                <View className="flex-1">
                  <Text className="text-[#5F5F5F] font-medium mb-1">Baños</Text>
                  <TextInput
                    keyboardType="number-pad"
                    value={form.numero_banos}
                    onChangeText={(val) =>
                      handleFieldChange("numero_banos", val)
                    }
                    placeholder="Ej. 1"
                    placeholderTextColor="#5F5F5F60"
                    className="h-12 bg-white border border-[#6B8E23]/20 text-[#5F5F5F] px-4 rounded-xl"
                  />
                  {renderError("numero_banos")}
                </View>
              </View>
            </View>

            {/* SECCIÓN: Fotografías */}
            <View className="mb-8">
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-1 mr-2">
                  <Text className="text-lg font-bold text-[#5F5F5F]">
                    Fotografías
                  </Text>
                  <Text className="text-xs text-[#5F5F5F]/75">
                    Sube entre 5 y 20 fotos (JPG, PNG o WEBP). Máximo 5 MB.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleSelectImages}
                  className="flex-row items-center bg-white px-3 py-2.5 rounded-xl border border-[#6B8E23]"
                >
                  <ImagePlus size={16} color="#6B8E23" />
                  <Text className="ml-1 text-xs font-semibold text-[#6B8E23]">
                    Seleccionar fotos
                  </Text>
                </TouchableOpacity>
              </View>

              {renderError("imagenes")}

              {/* Vista previa de imágenes en grid */}
              {images.length > 0 && (
                <View className="flex-row flex-wrap gap-2 mt-4">
                  {images.map((img) => (
                    <View
                      key={img.id}
                      className="relative rounded-xl overflow-hidden bg-white border border-[#6B8E23]/20"
                      style={{ width: "48%", height: 120 }}
                    >
                      <Image
                        source={{ uri: img.uri }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        onPress={() => removeImage(img.id)}
                        accessibilityLabel="Quitar imagen"
                        className="absolute right-2 top-2 h-7 w-7 rounded-lg bg-white/90 items-center justify-center shadow"
                      >
                        <Trash2 size={14} color="#A67C52" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Error global del formulario */}
            {errors.form && (
              <View className="mb-4 p-3 bg-red-100 rounded-xl">
                <Text className="text-xs text-red-800">{errors.form}</Text>
              </View>
            )}

            {/* Botones de Acción Final */}
            <View className="flex-col gap-3 mt-4">
              {isSuccess && (
                <TouchableOpacity
                  onPress={() =>
                    router.push("/arrendatario/MisPropiedades" as any)
                  }
                  className="h-12 border-2 border-[#6B8E23] rounded-xl items-center justify-center bg-white"
                >
                  <Text className="text-[#6B8E23] font-semibold">
                    Ver mis propiedades
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting}
                className={`h-12 bg-[#6B8E23] rounded-xl items-center justify-center ${
                  isSubmitting ? "opacity-60" : ""
                }`}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    Registrar propiedad
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal Nativo para Mensajes de Éxito o Error */}
      <Modal
        visible={actionMessage.open}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setActionMessage((curr) => ({ ...curr, open: false }))
        }
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="w-full max-w-sm bg-white p-6 rounded-2xl items-center shadow-lg">
            <View
              className={`h-12 w-12 rounded-full items-center justify-center mb-4 ${
                actionMessage.type === "success" ? "bg-green-100" : "bg-red-100"
              }`}
            >
              {actionMessage.type === "success" ? (
                <CheckCircle2 size={24} color="#15803d" />
              ) : (
                <AlertCircle size={24} color="#b91c1c" />
              )}
            </View>

            <Text className="text-lg font-bold text-[#5F5F5F] text-center mb-2">
              {actionMessage.title}
            </Text>
            <Text className="text-sm text-[#5F5F5F]/80 text-center mb-6">
              {actionMessage.description}
            </Text>

            <TouchableOpacity
              onPress={() =>
                setActionMessage((curr) => ({ ...curr, open: false }))
              }
              className="w-full bg-[#6B8E23] h-11 rounded-xl items-center justify-center"
            >
              <Text className="text-white font-semibold">Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default CrearPropiedad;
