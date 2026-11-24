import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { DollarSign, RefreshCw, Search, Users, X } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
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
import { BottomTabBar } from "../../components/BottomTabBar";
import { EmptyState } from "../../components/EmptyState";
import { HeaderInquilino } from "../../components/headerInquilino";
import { LoadingState } from "../../components/LoadingState";
import { PropertyCard } from "../../components/PropertyCard";
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
  const [focusedField, setFocusedField] = useState<
    "filtro" | "precio" | "huespedes" | null
  >(null);

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
    if (!authService.isAuthenticated()) {
      router.replace("/" as any);
      return;
    }
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
      params: { id: String(propiedadId), from: "explorar" },
    });
  };

  if (isStrictLandlord) {
    return null;
  }

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-[#FAFAFA]"
        edges={["top", "left", "right"]}
      >
        <StatusBar style="dark" />
        <HeaderInquilino />
        <View className="flex-1 bg-[#FAFAFA] justify-center items-center">
          <LoadingState message="Buscando alojamientos disponibles..." />
        </View>
        <BottomTabBar />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-[#FAFAFA]"
      edges={["top", "left", "right"]}
    >
      <StatusBar style="dark" />
      <HeaderInquilino />

      <ScrollView
        className="flex-1 bg-[#FAFAFA] px-4 py-6"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void cargarDatos(true);
            }}
            colors={["#B8860B"]}
            tintColor="#B8860B"
          />
        }
      >
        {/* Header Section & Buscador */}
        <View className="mb-6">
          <Text className="font-poppins text-3xl font-semibold tracking-tight text-[#1C1C1C] mb-1.5">
            Encuentra tu próximo destino
          </Text>
          <Text className="font-inter text-sm text-[#595959] mb-5">
            Explora las mejores propiedades verificadas en No Way Home
          </Text>

          <View className="bg-white rounded-2xl p-4 border border-[#DCDCDC] shadow-sm gap-3">
            <View
              className={`flex-row items-center rounded-xl border px-3.5 h-12 ${
                focusedField === "filtro"
                  ? "border-[#B8860B] bg-white"
                  : "border-[#DCDCDC] bg-[#FAFAFA]"
              }`}
            >
              <Search size={18} color="#B87333" />
              <TextInput
                placeholder="Buscar por ciudad, destino o nombre..."
                placeholderTextColor="#7A7A7A"
                className="flex-1 ml-2.5 font-inter-medium text-sm text-[#1C1C1C]"
                value={filtro}
                onChangeText={setFiltro}
                onFocus={() => setFocusedField("filtro")}
                onBlur={() => setFocusedField(null)}
              />
              {filtro.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setFiltro("")}
                  className="h-9 w-9 items-center justify-center"
                >
                  <X size={16} color="#1C1C1C" />
                </TouchableOpacity>
              ) : null}
            </View>

            <View className="flex-row gap-3">
              <View
                className={`flex-1 flex-row items-center rounded-xl border px-3 h-12 ${
                  focusedField === "precio"
                    ? "border-[#B8860B] bg-white"
                    : "border-[#DCDCDC] bg-[#FAFAFA]"
                }`}
              >
                <DollarSign size={16} color="#B87333" />
                <TextInput
                  placeholder="Costo máx."
                  placeholderTextColor="#7A7A7A"
                  keyboardType="numeric"
                  className="flex-1 ml-1.5 font-inter-medium text-xs text-[#1C1C1C]"
                  value={precioMax}
                  onChangeText={setPrecioMax}
                  onFocus={() => setFocusedField("precio")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <View
                className={`flex-1 flex-row items-center rounded-xl border px-3 h-12 ${
                  focusedField === "huespedes"
                    ? "border-[#B8860B] bg-white"
                    : "border-[#DCDCDC] bg-[#FAFAFA]"
                }`}
              >
                <Users size={16} color="#B87333" />
                <TextInput
                  placeholder="Huéspedes"
                  placeholderTextColor="#7A7A7A"
                  keyboardType="numeric"
                  className="flex-1 ml-1.5 font-inter-medium text-xs text-[#1C1C1C]"
                  value={huespedes}
                  onChangeText={setHuespedes}
                  onFocus={() => setFocusedField("huespedes")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {hayFiltros ? (
              <TouchableOpacity
                onPress={limpiarFiltros}
                className="min-h-[44px] flex-row items-center justify-center py-2 rounded-xl bg-[#F5F2EC] border border-[#DCDCDC]"
              >
                <X size={14} color="#B87333" />
                <Text className="ml-1.5 font-inter-medium text-xs text-[#B87333]">
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
              className="mt-3 min-h-[48px] self-start flex-row items-center bg-[#B8860B] px-5 py-3 rounded-xl"
            >
              <RefreshCw size={15} color="#FFFFFF" />
              <Text className="ml-2 font-inter-medium text-sm text-white">
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
                  className="min-h-[48px] justify-center bg-[#B8860B] px-5 py-3 rounded-xl"
                >
                  <Text className="font-inter-medium text-white text-sm">
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
                  <PropertyCard
                    key={idKey}
                    title={nombre}
                    location={ubicacion}
                    imageUri={imagen}
                    priceFormatted={formatPrice(precio)}
                    priceSuffix={esMensual ? "/ mes" : "/ noche"}
                    rating={
                      prop.calificacion_promedio ?? prop.calificacion ?? "4.9"
                    }
                    capacity={prop.capacidad}
                    actionLabel="Ver detalles"
                    isFavorite={isFavorito}
                    onToggleFavorite={() => void handleToggleFavorito(rawId)}
                    onImageError={() =>
                      setFailedImages((prev) => ({
                        ...prev,
                        [idKey]: true,
                      }))
                    }
                    onPress={() => handleVerDetalles(rawId)}
                  />
                );
              })}
            </View>
          )
        )}
      </ScrollView>

      <BottomTabBar />
    </SafeAreaView>
  );
}

export default ExplorarPage;
