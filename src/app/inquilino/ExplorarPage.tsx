import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  DollarSign,
  Heart,
  MapPin,
  RefreshCw,
  Search,
  Star,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE_URL, API_URL } from "@/config/api";
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
import { EmptyState } from "../../components/EmptyState";
import { HeaderInquilino } from "../../components/headerInquilino";
import { LoadingState } from "../../components/LoadingState";
import { PLACEHOLDER_PROPERTY_IMAGE } from "./constants";

function buildEndpointUrl(path: string): string {
  const cleanPath = String(path || "").replace(/^\/api(?=\/|$)/, "");
  const normalizedPath = cleanPath.startsWith("/")
    ? cleanPath
    : `/${cleanPath}`;
  return `${API_URL}${normalizedPath}`;
}

function getActiveTenantId(): string | number | null {
  const session = authService.getSession();
  if (!session?.isAuthenticated) return null;
  return getTenantId(getStoredSessionUser(), session?.role);
}

function extractFirstImageFromList(
  list: (string | PropiedadImagenItem)[] | null | undefined,
): string | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  const first = list[0];
  if (typeof first === "string" && first.trim()) return first.trim();
  if (first && typeof first === "object") {
    const candidate = first.url || first.imagen_url || first.imagen;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

function resolvePropertyImage(prop: PropiedadItem): string {
  const rawImage =
    prop.imagen_principal ||
    prop.imagen ||
    prop.image ||
    prop.imageUrl ||
    prop.imagen_url ||
    extractFirstImageFromList(prop.imagenes) ||
    extractFirstImageFromList(prop.images);

  if (!rawImage || typeof rawImage !== "string") {
    return PLACEHOLDER_PROPERTY_IMAGE;
  }

  const trimmed = rawImage.trim();
  if (!trimmed) return PLACEHOLDER_PROPERTY_IMAGE;

  if (/^(https?:\/\/|data:image\/)/i.test(trimmed)) {
    return trimmed;
  }

  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function ExplorarPage() {
  const router = useRouter();
  const [propiedades, setPropiedades] = useState<PropiedadItem[]>([]);
  const [filtro, setFiltro] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [huespedes, setHuespedes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | number | null>(() =>
    getActiveTenantId(),
  );
  const [isStrictLandlord, setIsStrictLandlord] = useState<boolean>(() => {
    const session = authService.getSession();
    const u = getStoredSessionUser();
    if (!session?.isAuthenticated || !u) return false;
    return (
      resolveUserRole(u, session?.role) === "arrendatario" &&
      !getTenantId(u, session?.role)
    );
  });
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextSession) => {
      if (!nextSession?.isAuthenticated) {
        setUserId(null);
        setIsStrictLandlord(false);
        setFavoritos(new Set());
        return;
      }
      const u = getStoredSessionUser();
      setUserId(getTenantId(u, nextSession?.role));
      setIsStrictLandlord(
        resolveUserRole(u, nextSession?.role) === "arrendatario" &&
          !getTenantId(u, nextSession?.role),
      );
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isStrictLandlord) {
      router.replace("/arrendatario/profileArrendatario" as any);
    }
  }, [isStrictLandlord, router]);

  const fetchCatalogAndFavorites = useCallback(async () => {
    const currentUserId = getActiveTenantId();

    const propiedadesPromise = propiedadController.cargarPropiedades();
    const favoritosPromise = currentUserId
      ? fetch(buildEndpointUrl(`/inquilino/${currentUserId}/favoritos`)).catch(
          () => null,
        )
      : Promise.resolve(null);

    const [propiedadesResult, favoritosResponse] = await Promise.all([
      propiedadesPromise,
      favoritosPromise,
    ]);

    let nextFavIds = new Set<string>();
    if (favoritosResponse && favoritosResponse.ok) {
      const favoritosData = await favoritosResponse.json().catch(() => ({}));
      const rawFavList = Array.isArray(favoritosData?.data)
        ? favoritosData.data
        : Array.isArray(favoritosData?.favorites)
          ? favoritosData.favorites
          : Array.isArray(favoritosData?.favoritos)
            ? favoritosData.favoritos
            : [];

      nextFavIds = new Set<string>(
        rawFavList
          .map((item: any) =>
            String(
              item?.id_propiedad ??
                item?.propiedad?.id_propiedad ??
                item?.id ??
                item,
            ),
          )
          .filter(Boolean),
      );
    }

    if (!propiedadesResult.success || !Array.isArray(propiedadesResult.data)) {
      throw new Error(
        propiedadesResult.error ||
          "No se pudieron cargar las propiedades disponibles.",
      );
    }

    return {
      currentUserId,
      propiedades: propiedadesResult.data,
      favoritos: nextFavIds,
    };
  }, []);

  useEffect(() => {
    if (isStrictLandlord) {
      return;
    }

    let isMounted = true;

    const init = async () => {
      try {
        const data = await fetchCatalogAndFavorites();
        if (isMounted) {
          setUserId(data.currentUserId);
          setPropiedades(data.propiedades);
          setFavoritos(data.favoritos);
          setError("");
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los datos del catálogo.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void init();

    return () => {
      isMounted = false;
    };
  }, [fetchCatalogAndFavorites, isStrictLandlord]);

  useFocusEffect(
    useCallback(() => {
      if (isStrictLandlord) {
        return;
      }

      let isMounted = true;
      void fetchCatalogAndFavorites()
        .then((data) => {
          if (!isMounted) return;
          setUserId(data.currentUserId);
          setPropiedades(data.propiedades);
          setFavoritos(data.favoritos);
          setError("");
        })
        .catch(() => {
          // Mantener datos previos si falla recarga silenciosa en foco
        });
      return () => {
        isMounted = false;
      };
    }, [fetchCatalogAndFavorites, isStrictLandlord]),
  );

  const cargarDatos = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError("");
      const data = await fetchCatalogAndFavorites();
      setUserId(data.currentUserId);
      setPropiedades(data.propiedades);
      setFavoritos(data.favoritos);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los datos del catálogo.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const propiedadesFiltradas = propiedades.filter((prop) => {
    const termino = filtro.trim().toLowerCase();
    const nombreProp = String(
      prop.titulo ||
        prop.titulo_propiedad ||
        prop.nombre_propiedad ||
        prop.nombre ||
        prop.descripcion ||
        "Propiedad",
    ).toLowerCase();
    const ubicacionProp = String(
      prop.ubicacion ||
        [prop.direccion, prop.ciudad, prop.pais].filter(Boolean).join(", ") ||
        "",
    ).toLowerCase();

    const matchTexto =
      !termino ||
      nombreProp.includes(termino) ||
      ubicacionProp.includes(termino);

    const maxPriceNum = parseFloat(precioMax);
    const precioProp = Number(
      (prop as Record<string, any>).precio_por_noche ??
        prop.precio_noche ??
        prop.precio ??
        prop.costo ??
        0,
    );
    const matchPrecio =
      Number.isNaN(maxPriceNum) || maxPriceNum <= 0 || precioProp <= maxPriceNum;

    const numGuests = parseInt(huespedes, 10);
    const capProp = Number(
      prop.capacidad ?? prop.huespedes ?? prop.max_huespedes ?? 0,
    );
    const matchGuests =
      Number.isNaN(numGuests) ||
      numGuests <= 0 ||
      capProp === 0 ||
      capProp >= numGuests;

    return matchTexto && matchPrecio && matchGuests;
  });

  const hayFiltros =
    filtro.trim() !== "" ||
    precioMax.trim() !== "" ||
    huespedes.trim() !== "";

  const limpiarFiltros = () => {
    setFiltro("");
    setPrecioMax("");
    setHuespedes("");
  };

  const formatPrice = (price: number | string | null | undefined) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(Number(price) || 0);
  };

  const handleToggleFavorito = async (propiedadId: string | number) => {
    const session = authService.getSession();
    const storedUser = getStoredSessionUser();
    const currentRole = resolveUserRole(storedUser, session?.role);
    const activeUserId = getActiveTenantId() ?? userId;

    if (!session?.isAuthenticated || !storedUser) {
      Alert.alert(
        "Sesión requerida",
        "Debes iniciar sesión como huésped para gestionar tus favoritos.",
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

    if (currentRole === "arrendatario" && !getTenantId(storedUser, session?.role)) {
      Alert.alert(
        "Modo Anfitrión",
        "Estás navegando con una cuenta de anfitrión. Inicia sesión con una cuenta de huésped para guardar favoritos.",
        [
          { text: "Volver", style: "cancel" },
          {
            text: "Cambiar cuenta",
            onPress: () => router.push("/loginPage" as any),
          },
        ],
      );
      return;
    }

    if (!activeUserId) {
      Alert.alert(
        "Sesión requerida",
        "Debes iniciar sesión como huésped para gestionar tus favoritos.",
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

    const key = String(propiedadId);
    const isFavorito = favoritos.has(key);

    try {
      const response = await fetch(buildEndpointUrl("/inquilino/favoritos"), {
        method: isFavorito ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_inquilino: activeUserId,
          id_propiedad: propiedadId,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Ocurrió un error en el servidor.");
      }

      setFavoritos((prev) => {
        const next = new Set(prev);
        if (isFavorito) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        err instanceof Error
          ? err.message
          : "No se pudo actualizar tus favoritos. Intenta de nuevo.",
      );
    }
  };

  const handleVerDetalles = (propiedadId: string | number) => {
    router.push({
      pathname: "/inquilino/detallesPropiedadPage" as any,
      params: { id: String(propiedadId) },
    });
  };

  if (isStrictLandlord) {
    return null;
  }

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["top", "left", "right"]}
      >
        <StatusBar style="dark" />
        <HeaderInquilino />
        <View className="flex-1 bg-[#FAFAFA] justify-center items-center">
          <LoadingState message="Buscando alojamientos disponibles..." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <HeaderInquilino />

      <ScrollView
        className="flex-1 bg-[#FAFAFA] px-4 py-6"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void cargarDatos(true);
            }}
            colors={["#6B8E23"]}
            tintColor="#6B8E23"
          />
        }
      >
        {/* Header Section & Buscador */}
        <View className="mb-6">
          <Text className="font-poppins text-3xl font-bold tracking-tight text-[#5F5F5F] mb-1.5">
            Encuentra tu próximo destino
          </Text>
          <Text className="text-sm text-[#5F5F5F]/75 mb-5">
            Explora las mejores propiedades verificadas en No Way Home
          </Text>

          <View className="bg-white rounded-2xl p-3.5 border border-[#6B8E23]/15 shadow-sm gap-3">
            <View className="flex-row items-center rounded-xl border border-[#6B8E23]/20 bg-[#FAFAFA] px-3.5 h-12">
              <Search size={18} color="#A67C52" />
              <TextInput
                placeholder="Buscar por ciudad, destino o nombre..."
                placeholderTextColor="#9CA3AF"
                className="flex-1 ml-2.5 text-sm text-[#5F5F5F]"
                value={filtro}
                onChangeText={setFiltro}
              />
              {filtro.length > 0 ? (
                <TouchableOpacity onPress={() => setFiltro("")} className="p-1">
                  <X size={16} color="#5F5F5F" />
                </TouchableOpacity>
              ) : null}
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 flex-row items-center rounded-xl border border-[#6B8E23]/20 bg-[#FAFAFA] px-3 h-11">
                <DollarSign size={16} color="#A67C52" />
                <TextInput
                  placeholder="Costo máx."
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  className="flex-1 ml-1.5 text-xs text-[#5F5F5F]"
                  value={precioMax}
                  onChangeText={setPrecioMax}
                />
              </View>

              <View className="flex-1 flex-row items-center rounded-xl border border-[#6B8E23]/20 bg-[#FAFAFA] px-3 h-11">
                <Users size={16} color="#A67C52" />
                <TextInput
                  placeholder="Huéspedes"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  className="flex-1 ml-1.5 text-xs text-[#5F5F5F]"
                  value={huespedes}
                  onChangeText={setHuespedes}
                />
              </View>
            </View>

            {hayFiltros ? (
              <TouchableOpacity
                onPress={limpiarFiltros}
                className="flex-row items-center justify-center py-2 rounded-xl bg-[#F2E8CF]/60"
              >
                <X size={14} color="#A67C52" />
                <Text className="ml-1.5 text-xs font-semibold text-[#A67C52]">
                  Limpiar filtros
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {error ? (
          <View className="mb-6">
            <AlertMessage
              type="error"
              title="No pudimos cargar el catálogo"
              message={error}
            />
            <TouchableOpacity
              onPress={() => void cargarDatos(false)}
              className="mt-3 self-start flex-row items-center bg-[#6B8E23] px-4 py-2.5 rounded-xl"
            >
              <RefreshCw size={15} color="#FFFFFF" />
              <Text className="ml-2 text-xs font-semibold text-white">
                Reintentar
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!error && propiedadesFiltradas.length === 0 ? (
          <EmptyState
            title="No encontramos resultados"
            message="Intenta con otros términos de búsqueda o limpia los filtros aplicados."
            action={
              hayFiltros ? (
                <TouchableOpacity
                  onPress={limpiarFiltros}
                  className="bg-[#6B8E23] px-5 py-2.5 rounded-xl"
                >
                  <Text className="text-white font-semibold text-sm">
                    Ver todas las propiedades
                  </Text>
                </TouchableOpacity>
              ) : undefined
            }
          />
        ) : (
          !error && (
            <View className="flex-col gap-5">
              {propiedadesFiltradas.map((prop, index) => {
                const rawId = prop.id_propiedad ?? prop.id ?? `prop-${index}`;
                const idKey = String(rawId);
                const nombre =
                  prop.titulo ||
                  prop.titulo_propiedad ||
                  prop.nombre_propiedad ||
                  prop.nombre ||
                  prop.descripcion ||
                  "Propiedad en NoWayHome";
                const ubicacion =
                  prop.ubicacion ||
                  [prop.direccion, prop.ciudad, prop.pais]
                    .filter(Boolean)
                    .join(", ") ||
                  "Ubicación no especificada";
                const precio =
                  (prop as Record<string, any>).precio_por_noche ??
                  prop.precio_noche ??
                  prop.precio ??
                  prop.costo ??
                  0;
                const esMensual =
                  String(
                    (prop as Record<string, any>).tipo_precio || "",
                  ).toLowerCase() === "mensual";
                const imagen = failedImages[idKey]
                  ? PLACEHOLDER_PROPERTY_IMAGE
                  : resolvePropertyImage(prop);
                const isFavorito = favoritos.has(idKey);

                return (
                  <TouchableOpacity
                    key={idKey}
                    activeOpacity={0.92}
                    className="flex-col overflow-hidden rounded-3xl bg-white shadow-sm border border-[#6B8E23]/10"
                    onPress={() => handleVerDetalles(rawId)}
                  >
                    {/* Imagen de la Tarjeta */}
                    <View className="relative w-full h-56 bg-[#F2E8CF]/30">
                      <Image
                        source={{ uri: imagen }}
                        className="h-full w-full"
                        resizeMode="cover"
                        onError={() =>
                          setFailedImages((prev) => ({
                            ...prev,
                            [idKey]: true,
                          }))
                        }
                      />

                      <TouchableOpacity
                        onPress={() => void handleToggleFavorito(rawId)}
                        className="absolute right-4 top-4 rounded-full bg-white/95 p-2.5 shadow-sm"
                      >
                        <Heart
                          size={20}
                          color={isFavorito ? "#ef4444" : "#5F5F5F"}
                          fill={isFavorito ? "#ef4444" : "transparent"}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Contenido de la Tarjeta */}
                    <View className="p-5 flex-1 justify-between">
                      <View>
                        <View className="mb-2 flex-row items-start justify-between">
                          <Text
                            className="flex-1 font-poppins text-lg font-semibold leading-tight text-[#5F5F5F]"
                            numberOfLines={2}
                          >
                            {nombre}
                          </Text>
                          <View className="ml-2 flex-row items-center rounded-lg bg-[#F2E8CF] px-2.5 py-1">
                            <Star size={14} color="#6B8E23" fill="#6B8E23" />
                            <Text className="ml-1 text-xs font-semibold text-[#5F5F5F]">
                              {prop.calificacion_promedio ??
                                prop.calificacion ??
                                "4.9"}
                            </Text>
                          </View>
                        </View>

                        <View className="mb-4 flex-row items-center">
                          <MapPin size={16} color="#A67C52" />
                          <Text
                            className="ml-1.5 flex-1 text-sm font-medium text-[#5F5F5F]/75"
                            numberOfLines={1}
                          >
                            {ubicacion}
                          </Text>
                        </View>
                      </View>

                      <View className="mt-1 border-t border-[#F2E8CF] pt-4">
                        <View className="flex-row items-baseline justify-between mb-4">
                          <View className="flex-row items-baseline">
                            <Text className="font-poppins text-2xl font-bold text-[#6B8E23]">
                              {formatPrice(precio)}
                            </Text>
                            <Text className="ml-1 text-sm font-medium text-[#5F5F5F]/60">
                              {esMensual ? "/ mes" : "/ noche"}
                            </Text>
                          </View>
                          {prop.capacidad ? (
                            <View className="flex-row items-center gap-1 bg-[#F2E8CF]/50 px-2.5 py-1 rounded-full">
                              <Users size={12} color="#A67C52" />
                              <Text className="text-xs font-medium text-[#5F5F5F]">
                                {prop.capacidad} huésp.
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <TouchableOpacity
                          className="h-12 w-full rounded-xl bg-[#6B8E23] items-center justify-center"
                          onPress={() => handleVerDetalles(rawId)}
                        >
                          <Text className="text-white font-semibold text-base">
                            Ver detalles
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default ExplorarPage;
