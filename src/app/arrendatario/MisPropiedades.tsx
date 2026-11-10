// src/screens/MisPropiedadesScreen.tsx
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Eye,
  ImageIcon,
  MapPin,
  Pencil,
  Plus,
  Users,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL } from '@/config/api';
import { authService } from '@/services/authService';
import {
  getLandlordId,
  getStoredSessionUser,
  resolveUserRole,
} from '@/utils/sessionRole';
import { HeaderArrendatario } from '../../components/headerArrendatario';
import { PropertyLocationMap } from '../../components/locacionPropiedadMap';
import { getLandlordProperties } from '../../services/propertyService';

// ---------------------------------------------------------------------------
// TIPOS E INTERFACES
// ---------------------------------------------------------------------------

export type PropertyStatus = 'activa' | 'inactiva' | 'suspendida' | string;

export interface PropertyImageObject {
  id_imagen?: string | number;
  url: string;
  es_principal?: boolean;
  [key: string]: unknown;
}

export interface PropertyItem {
  id_propiedad: string | number;
  titulo?: string;
  descripcion?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
  tipo_precio?: 'noche' | 'mensual' | string;
  precio_por_noche?: string | number;
  capacidad?: string | number;
  numero_habitaciones?: string | number;
  numero_banos?: string | number;
  latitud?: string | number | null;
  longitud?: string | number | null;
  estado?: PropertyStatus;
  imagen_principal?: string;
  imagenes?: PropertyImageObject[] | string[];
  [key: string]: unknown;
}

export interface UserData {
  id?: string | number;
  id_arrendatario?: string | number;
  role?: string;
  rol?: string;
  [key: string]: unknown;
}

interface StatusStyleConfig {
  container: string;
  text: string;
}

// ---------------------------------------------------------------------------
// CONSTANTES Y UTILIDADES
// ---------------------------------------------------------------------------

const statusStyles: Record<string, StatusStyleConfig> = {
  activa: {
    container: 'bg-[#6B8E23]',
    text: 'text-white',
  },
  inactiva: {
    container: 'bg-[#A67C52]/20',
    text: 'text-[#5F5F5F]',
  },
  suspendida: {
    container: 'bg-amber-100',
    text: 'text-amber-800',
  },
};

function resolveImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|data:image\/)/i.test(trimmed)) return trimmed;
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function getPropertyImages(property: PropertyItem | null): string[] {
  if (!property) return [];
  const images = Array.isArray(property?.imagenes) ? property.imagenes : [];
  const imageUrls: string[] = images
    .map((image) => resolveImageUrl(typeof image === 'string' ? image : image?.url))
    .filter((url): url is string => Boolean(url));

  const mainImage = resolveImageUrl(property?.imagen_principal);
  if (mainImage && !imageUrls.includes(mainImage)) {
    return [mainImage, ...imageUrls];
  }

  return imageUrls;
}

function getMainImage(property: PropertyItem | null): string {
  if (!property) return '';
  return resolveImageUrl(property?.imagen_principal) || getPropertyImages(property)[0] || '';
}

function hasCoordinates(property: PropertyItem | null): boolean {
  return (
    property?.latitud !== null &&
    property?.latitud !== undefined &&
    property?.latitud !== '' &&
    property?.longitud !== null &&
    property?.longitud !== undefined &&
    property?.longitud !== ''
  );
}

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------------------------

export function MisPropiedades() {
  const router = useRouter();

  const [sessionUser, setSessionUser] = useState<UserData | null>(
    () => getStoredSessionUser() as UserData | null
  );
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  useFocusEffect(
    useCallback(() => {
      setRefreshTrigger((prev) => prev + 1);
    }, []),
  );

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextSession) => {
      if (!nextSession?.isAuthenticated) {
        setSessionUser(null);
        return;
      }
      setSessionUser(
        (nextSession.user as UserData) || (getStoredSessionUser() as UserData | null)
      );
    });
    return unsubscribe;
  }, []);

  const resolvedRole = useMemo(() => resolveUserRole(sessionUser), [sessionUser]);
  const idArrendatario = useMemo(() => getLandlordId(sessionUser), [sessionUser]);
  const canView = Boolean(
    sessionUser &&
      (resolvedRole === 'arrendatario' || Boolean(sessionUser?.id_arrendatario)) &&
      idArrendatario
  );

  useEffect(() => {
    if (!authService.isAuthenticated() || !sessionUser) {
      return;
    }
    if (!canView) {
      router.replace('/inquilino/profileInquilino' as any);
    }
  }, [canView, router, sessionUser]);

  useEffect(() => {
    if (!canView || !idArrendatario) return;

    let isMounted = true;

    async function loadProperties() {
      try {
        setIsLoading(true);
        setError('');
        const data = await getLandlordProperties(idArrendatario);
        if (!isMounted) return;
        setProperties(Array.isArray(data) ? data : []);
      } catch (loadError: unknown) {
        if (!isMounted) return;
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'No se pudieron cargar tus propiedades. Intenta nuevamente.';
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProperties();

    return () => {
      isMounted = false;
    };
  }, [canView, idArrendatario, refreshTrigger]);

  const formatPrice = (property: PropertyItem): string => {
    const price = Number(property.precio_por_noche || 0).toLocaleString('es-MX', {
      maximumFractionDigits: 2,
    });
    return property.tipo_precio === 'mensual' ? `$${price} mensual` : `$${price} por noche`;
  };

  const getStatusConfig = (estado?: PropertyStatus): StatusStyleConfig => {
    if (!estado || !statusStyles[estado]) {
      return statusStyles.inactiva;
    }
    return statusStyles[estado];
  };

  if (!canView) return null;

  const selectedImages = getPropertyImages(selectedProperty);
  const selectedMainImage = getMainImage(selectedProperty);
  const selectedLocation = [
    selectedProperty?.direccion,
    selectedProperty?.ciudad,
    selectedProperty?.pais,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={['top']}>
      <StatusBar style="dark" />
      <HeaderArrendatario />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="flex-1 px-4 py-8">
        <View className="w-full max-w-5xl mx-auto">
          {/* Botón Volver al Perfil */}
          <TouchableOpacity
            onPress={() => router.push('/arrendatario/profileArrendatario' as any)}
            className="mb-5 flex-row items-center self-start rounded-xl border-2 border-[#6B8E23] px-4 py-2.5 bg-transparent active:bg-[#6B8E23]"
          >
            <ArrowLeft size={16} color="#6B8E23" />
            <Text className="ml-2 font-medium text-[#6B8E23]">Volver al perfil</Text>
          </TouchableOpacity>

          {/* Tarjeta Principal de Cabecera */}
          <View className="rounded-2xl bg-[#F2E8CF] p-6">
            <View className="flex-col gap-5">
              <View>
                <View className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#6B8E23] shadow-sm">
                  <Building2 size={24} color="#6B8E23" />
                </View>
                <Text className="text-2xl font-semibold text-[#5F5F5F]">
                  Mis propiedades
                </Text>
                <Text className="mt-2 text-sm text-[#5F5F5F]/80">
                  Administra los alojamientos que tienes publicados en NoWayHome.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/arrendatario/crearPropiedad' as any)}
                className="flex-row items-center justify-center rounded-xl bg-[#6B8E23] h-12 px-5 active:bg-[#5a7a1e] self-start"
              >
                <Plus size={16} color="#ffffff" />
                <Text className="ml-2 font-semibold text-white">Agregar propiedad</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sección de Propiedades */}
          <View className="mt-8">
            {/* Estado de Carga */}
            {isLoading && (
              <View className="p-6 bg-white border border-[#6B8E23]/10 shadow-sm rounded-2xl flex-row items-center">
                <ActivityIndicator size="small" color="#6B8E23" />
                <Text className="ml-3 text-[#5F5F5F]">Cargando propiedades...</Text>
              </View>
            )}

            {/* Estado de Error */}
            {!isLoading && error !== '' && (
              <View className="p-6 bg-white border border-red-100 shadow-sm rounded-2xl">
                <Text className="text-red-800">
                  No se pudieron cargar tus propiedades. Intenta nuevamente.
                </Text>
              </View>
            )}

            {/* Estado Sin Propiedades */}
            {!isLoading && !error && properties.length === 0 && (
              <View className="p-6 bg-white border border-[#6B8E23]/10 shadow-sm rounded-2xl">
                <View className="flex-col gap-4">
                  <Text className="text-[#5F5F5F]">Aún no tienes propiedades registradas.</Text>
                  <TouchableOpacity
                    onPress={() => router.push('/arrendatario/crearPropiedad' as any)}
                    className="flex-row items-center justify-center rounded-xl bg-[#6B8E23] h-11 px-4 active:bg-[#5a7a1e] self-start"
                  >
                    <Plus size={16} color="#ffffff" />
                    <Text className="ml-2 font-medium text-white">Agregar propiedad</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Listado de Propiedades */}
            {!isLoading && !error && properties.length > 0 && (
              <View className="flex-col gap-6">
                {properties.map((property) => {
                  const statusConf = getStatusConfig(property.estado);
                  const mainImgUri = getMainImage(property);

                  return (
                    <View
                      key={String(property.id_propiedad)}
                      className="overflow-hidden bg-white border border-[#6B8E23]/10 shadow-sm rounded-2xl"
                    >
                      {/* Imagen principal */}
                      {mainImgUri ? (
                        <Image
                          source={{ uri: mainImgUri }}
                          className="h-52 w-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="flex h-52 w-full items-center justify-center bg-[#F2E8CF]">
                          <Building2 size={40} color="#6B8E23" />
                        </View>
                      )}

                      {/* Detalles de la tarjeta */}
                      <View className="p-6">
                        <View className="mb-4 flex-row items-start justify-between gap-4">
                          <View className="flex-1">
                            <Text className="text-xl font-semibold text-[#5F5F5F]">
                              {property.titulo}
                            </Text>
                            <Text className="mt-1 text-sm text-[#5F5F5F]/75">
                              {[property.ciudad, property.pais].filter(Boolean).join(', ')}
                            </Text>
                          </View>

                          <View
                            className={`rounded-lg px-3 py-1 ${statusConf.container}`}
                          >
                            <Text className={`text-xs font-medium capitalize ${statusConf.text}`}>
                              {property.estado || 'inactiva'}
                            </Text>
                          </View>
                        </View>

                        <Text className="text-lg font-semibold text-[#6B8E23]">
                          {formatPrice(property)}
                        </Text>

                        {/* Fila de Capacidad, Habitaciones y Baños */}
                        <View className="mt-4 flex-row items-center justify-between text-sm text-[#5F5F5F]">
                          <View className="flex-row items-center gap-2">
                            <Users size={16} color="#A67C52" />
                            <Text className="text-sm text-[#5F5F5F]">
                              {property.capacidad ?? '-'}
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-2">
                            <BedDouble size={16} color="#A67C52" />
                            <Text className="text-sm text-[#5F5F5F]">
                              {property.numero_habitaciones ?? '-'}
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-2">
                            <Bath size={16} color="#A67C52" />
                            <Text className="text-sm text-[#5F5F5F]">
                              {property.numero_banos ?? '-'}
                            </Text>
                          </View>
                        </View>

                        {/* Botones de Acción */}
                        <View className="mt-6 flex-col gap-3 sm:flex-row">
                          <TouchableOpacity
                            onPress={() => setSelectedProperty(property)}
                            className="flex-row items-center justify-center rounded-xl border-2 border-[#6B8E23] py-2.5 px-4 active:bg-[#6B8E23]"
                          >
                            <Eye size={16} color="#6B8E23" />
                            <Text className="ml-2 font-medium text-[#6B8E23]">Ver detalles</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() =>
                              router.push({
                                pathname: '/arrendatario/EditarPropiedad',
                                params: { id: String(property.id_propiedad) },
                              } as any)
                            }
                            className="flex-row items-center justify-center rounded-xl border-2 border-[#6B8E23]/20 py-2.5 px-4 active:bg-[#F2E8CF]/30"
                          >
                            <Pencil size={16} color="#5F5F5F" />
                            <Text className="ml-2 font-medium text-[#5F5F5F]">Editar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modal / Diálogo de Previsualización de Propiedad */}
      <Modal
        visible={selectedProperty !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedProperty(null)}
      >
        <View className="flex-1 bg-black/50 justify-center px-4 py-8">
          <View className="max-h-[90%] w-full max-w-5xl self-center rounded-2xl bg-[#F2E8CF] overflow-hidden shadow-xl">
            {/* Modal Header */}
            <View className="flex-col gap-3 border-b border-[#6B8E23]/15 p-5">
              <View>
                <Text className="text-xs font-semibold uppercase tracking-wide text-[#6B8E23]">
                  Vista previa de publicación
                </Text>
                <Text className="mt-1 text-2xl font-semibold text-[#5F5F5F]">
                  {selectedProperty?.titulo || 'Propiedad sin título'}
                </Text>
              </View>

              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => {
                    const propId = selectedProperty?.id_propiedad;
                    setSelectedProperty(null);
                    if (propId !== undefined && propId !== null) {
                      router.push({
                        pathname: '/arrendatario/EditarPropiedad',
                        params: { id: String(propId) },
                      } as any);
                    }
                  }}
                  className="flex-row items-center rounded-xl border-2 border-[#6B8E23]/20 px-3 py-2 bg-transparent active:bg-white/60"
                >
                  <Pencil size={16} color="#5F5F5F" />
                  <Text className="ml-2 text-xs font-medium text-[#5F5F5F]">
                    Editar propiedad
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedProperty(null)}
                  className="flex-row items-center rounded-xl bg-[#6B8E23] px-3 py-2 active:bg-[#5a7a1e]"
                >
                  <X size={16} color="#ffffff" />
                  <Text className="ml-2 text-xs font-medium text-white">
                    Cerrar previsualización
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal Body Scrollable */}
            <ScrollView contentContainerStyle={{ padding: 20 }} className="flex-1">
              <View className="flex-col gap-6">
                {/* Imagen Principal */}
                {selectedMainImage ? (
                  <Image
                    source={{ uri: selectedMainImage }}
                    className="h-72 w-full rounded-xl"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="flex h-72 w-full items-center justify-center rounded-xl bg-white">
                    <View className="items-center gap-2">
                      <ImageIcon size={40} color="#6B8E23" />
                      <Text className="font-medium text-[#5F5F5F]">Imagen no disponible</Text>
                    </View>
                  </View>
                )}

                {/* Galería de Imágenes Adicionales */}
                {selectedImages.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                    {selectedImages.slice(1).map((imageUrl, index) => (
                      <Image
                        key={`${imageUrl}-${index}`}
                        source={{ uri: imageUrl }}
                        className="h-24 w-28 rounded-xl mr-3"
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                )}

                {/* Tarjeta de Información y Descripción */}
                <View className="rounded-xl bg-white p-5">
                  <Text className="text-xl font-semibold text-[#5F5F5F]">
                    {selectedProperty?.titulo || 'Propiedad sin título'}
                  </Text>
                  <Text className="mt-3 text-sm leading-6 text-[#5F5F5F]/85">
                    {selectedProperty?.descripcion || 'Sin descripción disponible.'}
                  </Text>
                  <View className="mt-4 flex-row items-start gap-2">
                    <MapPin size={16} color="#A67C52" className="mt-0.5" />
                    <Text className="text-sm text-[#5F5F5F]/80 flex-1">
                      {selectedLocation || 'Dirección no disponible'}
                    </Text>
                  </View>
                </View>

                {/* Tarjeta de Precio y Estado */}
                <View className="rounded-xl bg-white p-5">
                  {selectedProperty && (
                    <Text className="text-2xl font-semibold text-[#6B8E23]">
                      {formatPrice(selectedProperty)}
                    </Text>
                  )}
                  <Text className="mt-1 text-sm text-[#5F5F5F]/75">
                    {selectedProperty?.tipo_precio === 'mensual'
                      ? 'Precio mensual'
                      : 'Precio por noche'}
                  </Text>

                  {selectedProperty && (
                    <View
                      className={`mt-4 self-start rounded-lg px-3 py-1 ${
                        getStatusConfig(selectedProperty.estado).container
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium capitalize ${
                          getStatusConfig(selectedProperty.estado).text
                        }`}
                      >
                        {selectedProperty.estado || 'sin estado'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Resumen de Capacidad */}
                <View className="flex-row justify-between rounded-xl bg-white p-5 text-center">
                  <View className="flex-1 items-center">
                    <Users size={20} color="#A67C52" />
                    <Text className="mt-2 font-semibold text-[#5F5F5F]">
                      {selectedProperty?.capacidad ?? '-'}
                    </Text>
                    <Text className="text-xs text-[#5F5F5F]/70">Capacidad</Text>
                  </View>

                  <View className="flex-1 items-center">
                    <BedDouble size={20} color="#A67C52" />
                    <Text className="mt-2 font-semibold text-[#5F5F5F]">
                      {selectedProperty?.numero_habitaciones ?? '-'}
                    </Text>
                    <Text className="text-xs text-[#5F5F5F]/70">Habitaciones</Text>
                  </View>

                  <View className="flex-1 items-center">
                    <Bath size={20} color="#A67C52" />
                    <Text className="mt-2 font-semibold text-[#5F5F5F]">
                      {selectedProperty?.numero_banos ?? '-'}
                    </Text>
                    <Text className="text-xs text-[#5F5F5F]/70">Baños</Text>
                  </View>
                </View>

                {/* Ubicación y Mapa */}
                <View className="rounded-xl bg-white p-5">
                  <Text className="text-lg font-semibold text-[#5F5F5F]">Ubicación</Text>
                  {hasCoordinates(selectedProperty) ? (
                    <PropertyLocationMap
                      latitud={selectedProperty?.latitud}
                      longitud={selectedProperty?.longitud}
                      direccion={selectedLocation}
                      className="mt-3"
                    />
                  ) : (
                    <View className="mt-3 flex h-52 items-center justify-center rounded-xl border border-[#6B8E23]/15 bg-[#F2E8CF]/55">
                      <View className="items-center gap-2">
                        <MapPin size={24} color="#A67C52" />
                        <Text className="font-medium text-[#5F5F5F]">
                          Ubicación no disponible
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default MisPropiedades;