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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  getTenantId,
  hasValidId,
  resolveUserRole,
} from '@/utils/sessionRole';
import { BottomTabBar } from '../../components/BottomTabBar';
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
    container: 'bg-[#B8860B]',
    text: 'text-white',
  },
  inactiva: {
    container: 'bg-[#DCDCDC]',
    text: 'text-[#1C1C1C]',
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
  const [sessionRole, setSessionRole] = useState<string | null>(
    () => authService.getSession()?.role ?? null
  );
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const hasFocusedOnceRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }
      setRefreshTrigger((prev) => prev + 1);
    }, []),
  );

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextSession) => {
      if (!nextSession?.isAuthenticated) {
        setSessionUser(null);
        setSessionRole(null);
        return;
      }
      setSessionRole(nextSession?.role ?? null);
      setSessionUser(
        (getStoredSessionUser() as UserData | null) || (nextSession.user as UserData | null)
      );
    });
    return unsubscribe;
  }, []);

  const resolvedRole = useMemo(
    () => resolveUserRole(sessionUser, sessionRole),
    [sessionRole, sessionUser]
  );
  const idArrendatario = useMemo(
    () => getLandlordId(sessionUser, sessionRole),
    [sessionRole, sessionUser]
  );
  const tenantId = useMemo(
    () => getTenantId(sessionUser, sessionRole),
    [sessionRole, sessionUser]
  );
  const canView = Boolean(
    sessionUser &&
      (resolvedRole === 'arrendatario' || hasValidId(sessionUser?.id_arrendatario)) &&
      hasValidId(idArrendatario)
  );
  const shouldRedirectToTenant = Boolean(
    authService.isAuthenticated() &&
      sessionUser &&
      resolvedRole === 'inquilino' &&
      !hasValidId(sessionUser?.id_arrendatario) &&
      hasValidId(tenantId)
  );

  useEffect(() => {
    if (shouldRedirectToTenant) {
      router.replace('/inquilino/profileInquilino' as any);
    }
  }, [router, shouldRedirectToTenant]);

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

  if (!authService.isAuthenticated() || shouldRedirectToTenant) return null;

  if (!canView) {
    return (
      <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={['top']}>
        <StatusBar style="dark" />
        <HeaderArrendatario />
        <View className="flex-1 px-6 justify-center items-center">
          <View className="w-full max-w-md rounded-2xl bg-white border border-[#DCDCDC] p-6 items-center shadow-sm">
            <Building2 size={36} color="#DC2626" />
            <Text className="mt-3 font-poppins text-lg font-semibold text-[#1C1C1C] text-center">
              No se pudo validar tu cuenta de arrendatario
            </Text>
            <Text className="mt-2 font-inter text-sm text-[#595959] text-center leading-5">
              Vuelve a tu perfil o inicia sesión nuevamente para ver tus propiedades.
            </Text>
            <View className="mt-5 w-full flex-col gap-3">
              <TouchableOpacity
                onPress={() => router.replace('/arrendatario/profileArrendatario' as any)}
                className="min-h-[48px] justify-center w-full rounded-xl bg-[#B8860B] py-3 items-center"
              >
                <Text className="font-inter-medium text-white">Volver al perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  authService.logout();
                  router.replace('/loginPage' as any);
                }}
                className="min-h-[48px] justify-center w-full rounded-xl border-[1.5px] border-[#B8860B] py-3 items-center"
              >
                <Text className="font-inter-medium text-[#B8860B]">Volver a iniciar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <BottomTabBar />
      </SafeAreaView>
    );
  }

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
            className="mb-5 min-h-[44px] flex-row items-center self-start rounded-xl border-[1.5px] border-[#B8860B] px-4 py-2.5 bg-white"
          >
            <ArrowLeft size={16} color="#B8860B" />
            <Text className="ml-2 font-inter-medium text-[#B8860B]">Volver al perfil</Text>
          </TouchableOpacity>

          {/* Tarjeta Principal de Cabecera */}
          <View className="rounded-2xl bg-[#F5F2EC] border border-[#DCDCDC] p-6">
            <View className="flex-col gap-5">
              <View>
                <View className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-[#DCDCDC] shadow-sm">
                  <Building2 size={24} color="#B8860B" />
                </View>
                <Text className="font-poppins text-2xl font-semibold text-[#1C1C1C]">
                  Mis propiedades
                </Text>
                <Text className="mt-2 font-inter text-sm text-[#595959]">
                  Administra los alojamientos que tienes publicados en NoWayHome.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/arrendatario/crearPropiedad' as any)}
                className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#B8860B] px-5 active:bg-[#9A6F09] self-start"
              >
                <Plus size={16} color="#ffffff" />
                <Text className="ml-2 font-inter-medium text-white">Agregar propiedad</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sección de Propiedades */}
          <View className="mt-8">
            {/* Estado de Carga */}
            {isLoading && (
              <View className="p-6 bg-white border border-[#DCDCDC] shadow-sm rounded-2xl flex-row items-center">
                <ActivityIndicator size="small" color="#B8860B" />
                <Text className="ml-3 font-inter text-[#1C1C1C]">Cargando propiedades...</Text>
              </View>
            )}

            {/* Estado de Error */}
            {!isLoading && error !== '' && (
              <View className="p-6 bg-white border border-red-200 shadow-sm rounded-2xl">
                <Text className="font-inter text-red-800">
                  No se pudieron cargar tus propiedades. Intenta nuevamente.
                </Text>
              </View>
            )}

            {/* Estado Sin Propiedades */}
            {!isLoading && !error && properties.length === 0 && (
              <View className="p-6 bg-white border border-[#DCDCDC] shadow-sm rounded-2xl">
                <View className="flex-col gap-4">
                  <Text className="font-inter text-[#1C1C1C]">Aún no tienes propiedades registradas.</Text>
                  <TouchableOpacity
                    onPress={() => router.push('/arrendatario/crearPropiedad' as any)}
                    className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#B8860B] px-4 active:bg-[#9A6F09] self-start"
                  >
                    <Plus size={16} color="#ffffff" />
                    <Text className="ml-2 font-inter-medium text-white">Agregar propiedad</Text>
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
                      className="overflow-hidden bg-white border border-[#DCDCDC] shadow-sm rounded-2xl"
                    >
                      {/* Imagen principal */}
                      {mainImgUri ? (
                        <Image
                          source={{ uri: mainImgUri }}
                          className="h-52 w-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="flex h-52 w-full items-center justify-center bg-[#F5F2EC]">
                          <Building2 size={40} color="#B87333" />
                        </View>
                      )}

                      {/* Detalles de la tarjeta */}
                      <View className="p-6">
                        <View className="mb-4 flex-row items-start justify-between gap-4">
                          <View className="flex-1">
                            <Text className="font-poppins text-xl font-semibold text-[#1C1C1C]">
                              {property.titulo}
                            </Text>
                            <Text className="mt-1 font-inter text-sm text-[#595959]">
                              {[property.ciudad, property.pais].filter(Boolean).join(', ')}
                            </Text>
                          </View>

                          <View
                            className={`rounded-lg px-3 py-1 ${statusConf.container}`}
                          >
                            <Text className={`font-inter-medium text-xs capitalize ${statusConf.text}`}>
                              {property.estado || 'inactiva'}
                            </Text>
                          </View>
                        </View>

                        <Text className="font-poppins text-lg font-semibold text-[#B8860B]">
                          {formatPrice(property)}
                        </Text>

                        {/* Fila de Capacidad, Habitaciones y Baños */}
                        <View className="mt-4 flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <Users size={16} color="#B87333" />
                            <Text className="font-inter text-sm text-[#1C1C1C]">
                              {property.capacidad ?? '-'}
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-2">
                            <BedDouble size={16} color="#B87333" />
                            <Text className="font-inter text-sm text-[#1C1C1C]">
                              {property.numero_habitaciones ?? '-'}
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-2">
                            <Bath size={16} color="#B87333" />
                            <Text className="font-inter text-sm text-[#1C1C1C]">
                              {property.numero_banos ?? '-'}
                            </Text>
                          </View>
                        </View>

                        {/* Botones de Acción */}
                        <View className="mt-6 flex-col gap-3 sm:flex-row">
                          <TouchableOpacity
                            onPress={() => setSelectedProperty(property)}
                            className="min-h-[48px] flex-row items-center justify-center rounded-xl border-[1.5px] border-[#B8860B] py-2.5 px-4"
                          >
                            <Eye size={16} color="#B8860B" />
                            <Text className="ml-2 font-inter-medium text-[#B8860B]">Ver detalles</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() =>
                              router.push({
                                pathname: '/arrendatario/EditarPropiedad',
                                params: { id: String(property.id_propiedad) },
                              } as any)
                            }
                            className="min-h-[48px] flex-row items-center justify-center rounded-xl border border-[#DCDCDC] bg-[#FAFAFA] py-2.5 px-4"
                          >
                            <Pencil size={16} color="#B87333" />
                            <Text className="ml-2 font-inter-medium text-[#1C1C1C]">Editar</Text>
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

      <BottomTabBar />

      {/* Modal / Diálogo de Previsualización de Propiedad */}
      <Modal
        visible={selectedProperty !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedProperty(null)}
      >
        <View className="flex-1 bg-black/50 justify-center px-4 py-8">
          <View className="max-h-[90%] w-full max-w-5xl self-center rounded-2xl bg-[#FAFAFA] border border-[#DCDCDC] overflow-hidden shadow-xl">
            {/* Modal Header */}
            <View className="flex-col gap-3 border-b border-[#DCDCDC] bg-white p-5">
              <View>
                <Text className="font-inter-semibold text-xs uppercase tracking-wide text-[#B87333]">
                  Vista previa de publicación
                </Text>
                <Text className="mt-1 font-poppins text-2xl font-semibold text-[#1C1C1C]">
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
                  className="min-h-[44px] flex-row items-center rounded-xl border-[1.5px] border-[#B8860B] px-3.5 py-2 bg-transparent"
                >
                  <Pencil size={16} color="#B8860B" />
                  <Text className="ml-2 font-inter-medium text-xs text-[#B8860B]">
                    Editar propiedad
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedProperty(null)}
                  className="min-h-[44px] flex-row items-center rounded-xl bg-[#B8860B] px-3.5 py-2 active:bg-[#9A6F09]"
                >
                  <X size={16} color="#ffffff" />
                  <Text className="ml-2 font-inter-medium text-xs text-white">
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
                  <View className="flex h-72 w-full items-center justify-center rounded-xl bg-white border border-[#DCDCDC]">
                    <View className="items-center gap-2">
                      <ImageIcon size={40} color="#B87333" />
                      <Text className="font-inter-medium text-[#1C1C1C]">Imagen no disponible</Text>
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
                <View className="rounded-xl border border-[#DCDCDC] bg-white p-5">
                  <Text className="font-poppins text-xl font-semibold text-[#1C1C1C]">
                    {selectedProperty?.titulo || 'Propiedad sin título'}
                  </Text>
                  <Text className="mt-3 font-inter text-sm leading-6 text-[#595959]">
                    {selectedProperty?.descripcion || 'Sin descripción disponible.'}
                  </Text>
                  <View className="mt-4 flex-row items-start gap-2">
                    <MapPin size={16} color="#B87333" className="mt-0.5" />
                    <Text className="font-inter text-sm text-[#595959] flex-1">
                      {selectedLocation || 'Dirección no disponible'}
                    </Text>
                  </View>
                </View>

                {/* Tarjeta de Precio y Estado */}
                <View className="rounded-xl border border-[#DCDCDC] bg-white p-5">
                  {selectedProperty && (
                    <Text className="font-poppins text-2xl font-semibold text-[#B8860B]">
                      {formatPrice(selectedProperty)}
                    </Text>
                  )}
                  <Text className="mt-1 font-inter text-sm text-[#595959]">
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
                        className={`font-inter-medium text-xs capitalize ${
                          getStatusConfig(selectedProperty.estado).text
                        }`}
                      >
                        {selectedProperty.estado || 'sin estado'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Resumen de Capacidad */}
                <View className="flex-row justify-between rounded-xl border border-[#DCDCDC] bg-white p-5 text-center">
                  <View className="flex-1 items-center">
                    <Users size={20} color="#B87333" />
                    <Text className="mt-2 font-inter-semibold text-[#1C1C1C]">
                      {selectedProperty?.capacidad ?? '-'}
                    </Text>
                    <Text className="font-inter text-xs text-[#595959]">Capacidad</Text>
                  </View>

                  <View className="flex-1 items-center">
                    <BedDouble size={20} color="#B87333" />
                    <Text className="mt-2 font-inter-semibold text-[#1C1C1C]">
                      {selectedProperty?.numero_habitaciones ?? '-'}
                    </Text>
                    <Text className="font-inter text-xs text-[#595959]">Habitaciones</Text>
                  </View>

                  <View className="flex-1 items-center">
                    <Bath size={20} color="#B87333" />
                    <Text className="mt-2 font-inter-semibold text-[#1C1C1C]">
                      {selectedProperty?.numero_banos ?? '-'}
                    </Text>
                    <Text className="font-inter text-xs text-[#595959]">Baños</Text>
                  </View>
                </View>

                {/* Ubicación y Mapa */}
                <View className="rounded-xl border border-[#DCDCDC] bg-white p-5">
                  <Text className="font-poppins text-lg font-semibold text-[#1C1C1C]">Ubicación</Text>
                  {hasCoordinates(selectedProperty) ? (
                    <PropertyLocationMap
                      latitud={selectedProperty?.latitud}
                      longitud={selectedProperty?.longitud}
                      direccion={selectedLocation}
                      className="mt-3"
                    />
                  ) : (
                    <View className="mt-3 flex h-52 items-center justify-center rounded-xl border border-[#DCDCDC] bg-[#F5F2EC]">
                      <View className="items-center gap-2">
                        <MapPin size={24} color="#B87333" />
                        <Text className="font-inter-medium text-[#1C1C1C]">
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