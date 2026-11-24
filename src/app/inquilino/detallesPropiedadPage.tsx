import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Bath,
  Bed,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Star,
  Users,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE_URL } from "@/config/api";
import {
  propiedadController,
  type PropiedadImagenItem,
  type PropiedadItem,
} from "@/controllers/propiedadController";
import { authService } from "@/services/authService";
import {
  getStoredSessionUser,
  getTenantId,
  resolveUserRole,
} from "@/utils/sessionRole";
import { AlertMessage } from "../../components/AlertMessage";
import { Header } from "../../components/header";
import { HeaderArrendatario } from "../../components/headerArrendatario";
import { HeaderInquilino } from "../../components/headerInquilino";
import { LoadingState } from "../../components/LoadingState";
import { PropertyLocationMap } from "../../components/locacionPropiedadMap";
import { PLACEHOLDER_PROPERTY_IMAGE } from "./constants";

function resolveImageUri(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (/^(https?:\/\/|data:image\/)/i.test(trimmed)) return trimmed;
    const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${API_BASE_URL}${normalizedPath}`;
  }
  if (typeof raw === "object") {
    const item = raw as PropiedadImagenItem;
    return resolveImageUri(item.url || item.imagen_url || item.imagen);
  }
  return null;
}

export function PropertyDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
    from?: string | string[];
    soloInfo?: string | string[];
  }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const fromParam = String(
    Array.isArray(params.from) ? params.from[0] : params.from || "",
  )
    .trim()
    .toLowerCase();
  const soloInfoParam = String(
    Array.isArray(params.soloInfo) ? params.soloInfo[0] : params.soloInfo || "",
  )
    .trim()
    .toLowerCase();
  const isFromIndex =
    fromParam === "index" ||
    soloInfoParam === "true" ||
    soloInfoParam === "1";

  const [propiedad, setPropiedad] = useState<PropiedadItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [imagenActual, setImagenActual] = useState(0);
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean;
    isStrictLandlord: boolean;
    isTenant: boolean;
  }>(() => {
    const session = authService.getSession();
    const storedUser = getStoredSessionUser();
    if (!session?.isAuthenticated || !storedUser) {
      return {
        isAuthenticated: false,
        isStrictLandlord: false,
        isTenant: false,
      };
    }
    const role = resolveUserRole(storedUser, session?.role);
    const tenantId = getTenantId(storedUser, session?.role);
    return {
      isAuthenticated: true,
      isStrictLandlord: role === "arrendatario" && !tenantId,
      isTenant: role === "inquilino" || Boolean(tenantId),
    };
  });

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextSession) => {
      if (!nextSession?.isAuthenticated) {
        setAuthState({
          isAuthenticated: false,
          isStrictLandlord: false,
          isTenant: false,
        });
        return;
      }
      const storedUser = getStoredSessionUser();
      if (!storedUser) {
        setAuthState({
          isAuthenticated: false,
          isStrictLandlord: false,
          isTenant: false,
        });
        return;
      }
      const role = resolveUserRole(storedUser, nextSession?.role);
      const tenantId = getTenantId(storedUser, nextSession?.role);
      setAuthState({
        isAuthenticated: true,
        isStrictLandlord: role === "arrendatario" && !tenantId,
        isTenant: role === "inquilino" || Boolean(tenantId),
      });
    });
    return unsubscribe;
  }, []);

  const isStrictLandlord = authState.isStrictLandlord;
  const isInfoOnly =
    isFromIndex || !authState.isAuthenticated || !authState.isTenant || isStrictLandlord;

  const renderHeader = () => {
    if (isFromIndex || !authState.isAuthenticated) {
      return <Header />;
    }
    if (isStrictLandlord) {
      return <HeaderArrendatario />;
    }
    return <HeaderInquilino />;
  };

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const fetchPropiedad = async () => {
        if (!id) {
          if (isMounted) {
            setError("ID de propiedad no válido.");
            setIsLoading(false);
          }
          return;
        }

        try {
          setError("");
          const result = await propiedadController.cargarDetallesPropiedad(id);
          if (!isMounted) return;

          if (result.success && result.data) {
            setPropiedad(result.data);
            setImagenActual(0);
          } else {
            setError(result.error || "No se pudo cargar la propiedad.");
          }
        } catch (loadError: unknown) {
          if (!isMounted) return;
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar la propiedad.",
          );
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      void fetchPropiedad();

      return () => {
        isMounted = false;
      };
    }, [id]),
  );

  const galleryUrls = useMemo<string[]>(() => {
    if (!propiedad) return [PLACEHOLDER_PROPERTY_IMAGE];

    const list: string[] = [];
    const rawList = Array.isArray(propiedad.imagenes)
      ? propiedad.imagenes
      : Array.isArray(propiedad.images)
        ? propiedad.images
        : [];

    for (const item of rawList) {
      const resolved = resolveImageUri(item);
      if (resolved && !list.includes(resolved)) {
        list.push(resolved);
      }
    }

    const mainImg = resolveImageUri(
      propiedad.imagen_principal || propiedad.imagen || propiedad.imageUrl,
    );
    if (mainImg && !list.includes(mainImg)) {
      list.unshift(mainImg);
    }

    return list.length > 0 ? list : [PLACEHOLDER_PROPERTY_IMAGE];
  }, [propiedad]);

  const formatPrice = (price: number | string | null | undefined) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(Number(price) || 0);
  };

  const handlePrevImage = () => {
    setImagenActual((prev) =>
      prev === 0 ? galleryUrls.length - 1 : prev - 1,
    );
  };

  const handleNextImage = () => {
    setImagenActual((prev) =>
      prev === galleryUrls.length - 1 ? 0 : prev + 1,
    );
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (isFromIndex || !authState.isAuthenticated || isStrictLandlord) {
      router.replace("/" as any);
    } else {
      router.push("/inquilino/ExplorarPage" as any);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-[#FAFAFA]"
        edges={["top", "left", "right"]}
      >
        <StatusBar style="dark" />
        {renderHeader()}
        <View className="flex-1 bg-[#FAFAFA] justify-center items-center">
          <LoadingState message="Cargando propiedad..." />
        </View>
      </SafeAreaView>
    );
  }

  if (!propiedad) {
    return (
      <SafeAreaView
        className="flex-1 bg-[#FAFAFA]"
        edges={["top", "left", "right"]}
      >
        <StatusBar style="dark" />
        {renderHeader()}
        <View className="flex-1 bg-[#FAFAFA] px-4 py-8 justify-center items-center">
          {error ? (
            <AlertMessage
              type="error"
              title="No pudimos cargar esta propiedad"
              message={error}
              className="mb-6 w-full"
            />
          ) : null}

          <View className="items-center justify-center p-6 bg-white rounded-2xl w-full border border-[#DCDCDC] shadow-sm">
            <Text className="font-poppins font-semibold text-xl text-[#1C1C1C] mb-2 text-center">
              Propiedad no disponible
            </Text>
            <Text className="font-inter text-[#595959] text-center mb-6">
              La propiedad solicitada no existe o no se encuentra disponible en
              este momento.
            </Text>
            <TouchableOpacity
              onPress={() =>
                router.push(
                  (isFromIndex || !authState.isAuthenticated
                    ? "/"
                    : isStrictLandlord
                      ? "/arrendatario/profileArrendatario"
                      : "/inquilino/ExplorarPage") as any,
                )
              }
              className="min-h-[48px] justify-center w-full rounded-xl bg-[#B8860B] px-4 py-3.5 items-center"
            >
              <Text className="font-inter-medium text-white text-base">
                {isFromIndex || !authState.isAuthenticated
                  ? "Volver al inicio"
                  : isStrictLandlord
                    ? "Volver a mi panel"
                    : "Explorar otras propiedades"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const title =
    propiedad.titulo ||
    propiedad.titulo_propiedad ||
    propiedad.nombre_propiedad ||
    propiedad.nombre ||
    propiedad.title ||
    propiedad.descripcion ||
    "Propiedad";
  const location =
    propiedad.ubicacion ||
    [propiedad.direccion, propiedad.ciudad, propiedad.pais]
      .filter(Boolean)
      .join(", ") ||
    propiedad.location ||
    "Ubicación desconocida";
  const price =
    propiedad.precio_noche ??
    propiedad.precio_por_noche ??
    propiedad.precio ??
    propiedad.price ??
    0;

  const hasValue = (value: unknown) =>
    value !== null && value !== undefined && value !== "";

  const capacidadVal =
    propiedad.capacidad ?? propiedad.huespedes ?? propiedad.max_huespedes;
  const habitacionesVal =
    propiedad.numero_habitaciones ?? propiedad.habitaciones;
  const banosVal = propiedad.numero_banos ?? propiedad.banos;

  const resolvedPropertyId = String(
    propiedad.id_propiedad ?? propiedad.id ?? id ?? "",
  );

  const handleReservePress = () => {
    if (isInfoOnly) {
      return;
    }

    const session = authService.getSession();
    const storedUser = getStoredSessionUser();

    if (!session?.isAuthenticated || !storedUser) {
      Alert.alert(
        "Inicia sesión para reservar",
        "Necesitas iniciar sesión con una cuenta de huésped para solicitar una reserva.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Iniciar sesión",
            onPress: () => router.push("/loginPage" as any),
          },
        ],
      );
      return;
    }

    const role = resolveUserRole(storedUser, session?.role);
    const tenantId = getTenantId(storedUser, session?.role);
    if (role === "arrendatario" && !tenantId) {
      Alert.alert(
        "Modo Anfitrión",
        "Has iniciado sesión como anfitrión. Para realizar reservas debes usar una cuenta de huésped.",
        [
          { text: "Volver", style: "cancel" },
          {
            text: "Mi panel anfitrión",
            onPress: () =>
              router.push("/arrendatario/profileArrendatario" as any),
          },
          {
            text: "Cambiar cuenta",
            onPress: () => router.push("/loginPage" as any),
          },
        ],
      );
      return;
    }

    router.push({
      pathname: "/inquilino/ReservaPage" as any,
      params: { id: resolvedPropertyId },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      {renderHeader()}

      <ScrollView
        className="flex-1 bg-[#FAFAFA]"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-5 pb-4">
          <TouchableOpacity
            onPress={handleBack}
            className="flex-row items-center mb-5 self-start min-h-[44px]"
          >
            <ArrowLeft size={20} color="#B87333" />
            <Text className="ml-2 font-inter-medium text-sm text-[#1C1C1C]">
              {isFromIndex || !authState.isAuthenticated
                ? "Volver al inicio"
                : isStrictLandlord
                  ? "Volver"
                  : "Volver al catálogo"}
            </Text>
          </TouchableOpacity>

          {error ? (
            <AlertMessage
              type="error"
              title="Error"
              message={error}
              className="mb-6"
            />
          ) : null}

          {/* Encabezado Principal */}
          <View className="mb-5">
            <Text className="font-poppins text-2xl font-semibold text-[#1C1C1C] mb-2.5">
              {title}
            </Text>
            <View className="flex-row flex-wrap items-center gap-y-2 gap-x-4">
              <View className="flex-row items-center flex-1">
                <MapPin size={16} color="#B87333" />
                <Text
                  className="ml-1.5 font-inter-medium text-sm text-[#595959] flex-1"
                  numberOfLines={2}
                >
                  {location}
                </Text>
              </View>
              <View className="flex-row items-center bg-[#F5F2EC] border border-[#DCDCDC] px-2.5 py-1 rounded-full">
                <Star size={14} color="#B8860B" fill="#B8860B" />
                <Text className="ml-1 font-inter-semibold text-xs text-[#1C1C1C]">
                  {propiedad.calificacion_promedio ??
                    propiedad.calificacion ??
                    "4.9"}
                </Text>
              </View>
            </View>
          </View>

          {/* Galería de Imágenes */}
          <View className="relative w-full h-64 rounded-2xl overflow-hidden mb-6 bg-[#F5F2EC] border border-[#DCDCDC]">
            <Image
              source={{
                uri: galleryUrls[imagenActual] || PLACEHOLDER_PROPERTY_IMAGE,
              }}
              className="w-full h-full"
              resizeMode="cover"
            />
            {galleryUrls.length > 1 && (
              <>
                <TouchableOpacity
                  onPress={handlePrevImage}
                  className="absolute left-3 top-1/2 -mt-5 bg-white/90 rounded-full p-2.5 border border-[#DCDCDC]"
                  style={
                    Platform.OS === "ios"
                      ? { shadowOpacity: 0.1, shadowRadius: 3 }
                      : { elevation: 2 }
                  }
                >
                  <ChevronLeft size={22} color="#1C1C1C" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleNextImage}
                  className="absolute right-3 top-1/2 -mt-5 bg-white/90 rounded-full p-2.5 border border-[#DCDCDC]"
                  style={
                    Platform.OS === "ios"
                      ? { shadowOpacity: 0.1, shadowRadius: 3 }
                      : { elevation: 2 }
                  }
                >
                  <ChevronRight size={22} color="#1C1C1C" />
                </TouchableOpacity>

                {/* Indicadores de Paginación */}
                <View className="absolute bottom-3 w-full flex-row justify-center items-center">
                  <View className="flex-row bg-[#1C1C1C]/50 rounded-full px-2.5 py-1.5 items-center gap-1.5">
                    {galleryUrls.map((_, idx: number) => (
                      <View
                        key={idx}
                        className={`h-2 rounded-full ${
                          idx === imagenActual
                            ? "w-6 bg-[#B8860B]"
                            : "w-2 bg-white/80"
                        }`}
                      />
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Tarjeta de Detalles */}
          <View className="bg-white rounded-2xl p-6 border border-[#DCDCDC] shadow-sm mb-6">
            <Text className="font-inter text-sm text-[#595959] mb-1">
              {isInfoOnly ? "Ficha informativa" : "Reserva esta propiedad"}
            </Text>
            <Text className="font-poppins text-xl font-semibold text-[#1C1C1C] mb-5">
              {isInfoOnly
                ? "Información del alojamiento"
                : "Prepárate para tu estancia"}
            </Text>

            {(hasValue(capacidadVal) ||
              hasValue(habitacionesVal) ||
              hasValue(banosVal)) && (
              <View className="border-t border-[#DCDCDC] pt-5 mb-5">
                <Text className="font-inter-semibold text-sm text-[#595959] mb-4">
                  Características
                </Text>
                <View className="flex-row flex-wrap justify-between gap-y-3">
                  {hasValue(capacidadVal) && (
                    <View className="w-[48%] flex-row items-center gap-3 rounded-xl bg-[#F5F2EC] border border-[#DCDCDC] p-3">
                      <Users size={20} color="#B87333" />
                      <View>
                        <Text className="font-inter text-[11px] text-[#595959]">
                          Capacidad
                        </Text>
                        <Text className="font-inter-semibold text-[#1C1C1C] text-sm">
                          {capacidadVal} huésp.
                        </Text>
                      </View>
                    </View>
                  )}
                  {hasValue(habitacionesVal) && (
                    <View className="w-[48%] flex-row items-center gap-3 rounded-xl bg-[#F5F2EC] border border-[#DCDCDC] p-3">
                      <Bed size={20} color="#B87333" />
                      <View>
                        <Text className="font-inter text-[11px] text-[#595959]">
                          Habitaciones
                        </Text>
                        <Text className="font-inter-semibold text-[#1C1C1C] text-sm">
                          {habitacionesVal}
                        </Text>
                      </View>
                    </View>
                  )}
                  {hasValue(banosVal) && (
                    <View className="w-[48%] flex-row items-center gap-3 rounded-xl bg-[#F5F2EC] border border-[#DCDCDC] p-3">
                      <Bath size={20} color="#B87333" />
                      <View>
                        <Text className="font-inter text-[11px] text-[#595959]">
                          Baños
                        </Text>
                        <Text className="font-inter-semibold text-[#1C1C1C] text-sm">
                          {banosVal}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Mapa de Ubicación */}
            <View className="border-t border-[#DCDCDC] pt-5 mb-5">
              <Text className="font-inter text-sm text-[#595959] mb-1">
                Ubicación
              </Text>
              <Text className="font-inter-medium text-base text-[#1C1C1C] mb-4">
                {location}
              </Text>
              <PropertyLocationMap
                latitud={propiedad.latitud}
                longitud={propiedad.longitud}
                direccion={location}
              />
            </View>

            {/* Descripción Adicional */}
            <View className="border-t border-[#DCDCDC] pt-5">
              <Text className="font-poppins text-base font-semibold text-[#1C1C1C] mb-3">
                Acerca de este alojamiento
              </Text>
              <Text className="font-inter text-base leading-relaxed text-[#595959]">
                {propiedad.descripcion ||
                  propiedad.resena ||
                  "Descripción no disponible para esta propiedad."}
              </Text>
            </View>
          </View>

          {/* Información Importante */}
          <View className="rounded-xl bg-[#F5F2EC] p-4 mb-2 border border-[#DCDCDC]">
            <Text className="font-poppins font-semibold text-[#1C1C1C] mb-1">
              {isInfoOnly
                ? "Información del alojamiento"
                : "Información importante"}
            </Text>
            <Text className="font-inter text-sm text-[#595959] leading-relaxed">
              {isInfoOnly
                ? "Esta vista es únicamente informativa. Aquí puedes consultar las características, ubicación en el mapa y descripción general de esta propiedad verificada en No Way Home."
                : "Tu reserva será registrada y podrás consultarla desde tu perfil. Se confirmará conforme a disponibilidad del anfitrión."}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer Fijo / Sticky (Móvil) */}
      <View
        className="bg-white px-5 py-4 flex-row items-center justify-between border-t border-[#DCDCDC]"
        style={Platform.OS === "ios" ? { paddingBottom: 24 } : {}}
      >
        <View className="flex-col">
          <View className="flex-row items-baseline gap-1">
            <Text className="font-poppins text-2xl font-semibold text-[#B8860B]">
              {formatPrice(price)}
            </Text>
            <Text className="font-inter text-sm text-[#595959]">
              {String(
                (propiedad as Record<string, any>).tipo_precio || "",
              ).toLowerCase() === "mensual"
                ? "/ mes"
                : "/ noche"}
            </Text>
          </View>
          <Text className="font-inter-medium text-xs uppercase text-[#B87333] mt-1">
            {propiedad.estado || "Disponible"}
          </Text>
        </View>

        {isInfoOnly ? (
          <View className="bg-[#F5F2EC] rounded-xl px-4 py-2.5 items-center justify-center border border-[#DCDCDC]">
            <Text className="font-inter-semibold text-[#B87333] text-xs uppercase tracking-wider">
              Solo información
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleReservePress}
            className="min-h-[48px] bg-[#B8860B] rounded-xl px-7 py-3.5 items-center justify-center shadow-sm"
          >
            <Text className="font-inter-medium text-white text-base">
              Reservar
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

export default PropertyDetailPage;
