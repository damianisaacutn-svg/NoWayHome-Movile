import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  DollarSign,
  FileText,
  Home,
  Info,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react-native";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactElement,
} from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomTabBar } from "@/components/BottomTabBar";
import { Header } from "@/components/header";
import { PropertyCard } from "@/components/PropertyCard";
import { API_BASE_URL } from "@/config/api";
import {
  propiedadController,
  type PropiedadImagenItem,
  type PropiedadItem,
} from "../controllers/propiedadController";

const PLACEHOLDER_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80";

function parseNumericValue(
  value: number | string | null | undefined,
): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getPropertyTitle(prop: PropiedadItem): string {
  return (
    prop.titulo ||
    prop.nombre ||
    prop.title ||
    prop.name ||
    prop.descripcion ||
    prop.description ||
    ""
  );
}

function getPropertyLocation(prop: PropiedadItem): string {
  return (
    prop.ubicacion ||
    [prop.direccion, prop.ciudad, prop.pais].filter(Boolean).join(", ") ||
    prop.location ||
    prop.address ||
    prop.city ||
    ""
  );
}

function getPropertyPrice(prop: PropiedadItem): number {
  return parseNumericValue(
    (prop as Record<string, any>).precio_por_noche ??
      prop.precio_noche ??
      prop.precio ??
      prop.costo ??
      prop.pricePerNight ??
      prop.price_per_night ??
      prop.price ??
      0,
  );
}

function getPropertyCapacity(prop: PropiedadItem): number {
  return parseNumericValue(
    prop.capacidad ??
      prop.huespedes ??
      prop.max_huespedes ??
      prop.capacity ??
      prop.guests ??
      prop.maxGuests ??
      prop.max_guests ??
      0,
  );
}

function extractFirstImageFromList(
  list: (string | PropiedadImagenItem)[] | null | undefined,
): string | null {
  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }
  const first = list[0];
  if (typeof first === "string" && first.trim()) {
    return first.trim();
  }
  if (first && typeof first === "object") {
    const candidate = first.url || first.imagen_url;
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
  if (!trimmed) {
    return PLACEHOLDER_PROPERTY_IMAGE;
  }

  if (/^(https?:\/\/|data:image\/)/i.test(trimmed)) {
    return trimmed;
  }

  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export default function HomePage(): ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{ ver?: string | string[] }>();
  const verParam = Array.isArray(params.ver) ? params.ver[0] : params.ver;

  const scrollViewRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [catalogOffsetY, setCatalogOffsetY] = useState<number>(0);

  const [propiedades, setPropiedades] = useState<PropiedadItem[]>([]);
  const [destino, setDestino] = useState<string>("");
  const [precioMax, setPrecioMax] = useState<string>("");
  const [huespedes, setHuespedes] = useState<string>("");
  const [focusedField, setFocusedField] = useState<
    "destino" | "precio" | "huespedes" | null
  >(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>(
    {},
  );
  const [infoModalType, setInfoModalType] = useState<
    "anfitrion" | "aventura" | "privacidad" | "terminos" | null
  >(null);

  useEffect(() => {
    if (verParam === "explorar" && catalogOffsetY > 0) {
      scrollViewRef.current?.scrollTo({ y: catalogOffsetY, animated: true });
    }
  }, [verParam, catalogOffsetY]);

  const cargarCatalogo = useCallback(async (): Promise<PropiedadItem[]> => {
    const result = await propiedadController.cargarPropiedades();

    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }

    throw new Error(
      result.error || "No se pudieron cargar las propiedades disponibles.",
    );
  }, []);

  const hasLoadedCatalogRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const refreshCatalog = async (): Promise<void> => {
        try {
          const data = await cargarCatalogo();
          if (isMounted) {
            hasLoadedCatalogRef.current = true;
            setPropiedades(data);
            setError(null);
          }
        } catch (err: unknown) {
          if (isMounted && !hasLoadedCatalogRef.current) {
            const message =
              err instanceof Error && err.message
                ? err.message
                : "Error al conectar con el servidor.";
            setError(message);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      void refreshCatalog();
      return () => {
        isMounted = false;
      };
    }, [cargarCatalogo]),
  );

  const handleRecargar = async (refresh = false): Promise<void> => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      const data = await cargarCatalogo();
      setFailedImageIds({});
      setPropiedades(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Error al conectar con el servidor.";
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const propiedadesFiltradas = propiedades.filter(
    (prop: PropiedadItem): boolean => {
      const termino = destino.toLowerCase().trim();
      const matchTexto = ((): boolean => {
        if (!termino) return true;
        const nombreProp = getPropertyTitle(prop);
        const ubicacionProp = getPropertyLocation(prop);
        return (
          nombreProp.toLowerCase().includes(termino) ||
          ubicacionProp.toLowerCase().includes(termino)
        );
      })();

      const maxPrice = parseFloat(precioMax);
      const matchPrecio = ((): boolean => {
        if (isNaN(maxPrice) || maxPrice <= 0) return true;
        const precioProp = getPropertyPrice(prop);
        return precioProp <= maxPrice;
      })();

      const numHuespedes = parseInt(huespedes, 10);
      const matchHuespedes = ((): boolean => {
        if (isNaN(numHuespedes) || numHuespedes <= 0) return true;
        const capacidadProp = getPropertyCapacity(prop);
        return capacidadProp >= numHuespedes;
      })();

      return matchTexto && matchPrecio && matchHuespedes;
    },
  );

  const hayFiltrosActivos =
    destino.trim() !== "" ||
    precioMax.trim() !== "" ||
    huespedes.trim() !== "";

  const limpiarFiltros = (): void => {
    setDestino("");
    setPrecioMax("");
    setHuespedes("");
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const handleOpenPdf = (tipo: string): void => {
    if (tipo.toLowerCase().includes("privacidad")) {
      setInfoModalType("privacidad");
    } else {
      setInfoModalType("terminos");
    }
  };

  const handleHostCta = (): void => {
    setInfoModalType("anfitrion");
  };

  const handleNavigateRegister = (): void => {
    setInfoModalType("aventura");
  };

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-[#FAFAFA]"
        edges={["top", "left", "right"]}
      >
        <StatusBar style="dark" />
        <Header />

        <View className="flex-1 bg-[#FAFAFA] items-center justify-center px-6">
          <View className="w-16 h-16 rounded-2xl bg-[#F5F2EC] border border-[#DCDCDC] items-center justify-center mb-4">
            <ActivityIndicator size="large" color="#B8860B" />
          </View>
          <Text className="font-poppins text-lg font-semibold text-[#1C1C1C] text-center">
            No Way Home
          </Text>
          <Text className="mt-1 font-inter text-sm text-[#595959] text-center">
            Buscando alojamientos disponibles...
          </Text>
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
      <Header />

      <ScrollView
        ref={scrollViewRef}
        className="flex-1 bg-[#FAFAFA]"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void handleRecargar(true);
            }}
            colors={["#B8860B"]}
            tintColor="#B8860B"
          />
        }
      >
        {/* Hero Section - Calma Urbana */}
        <View className="bg-[#F5F2EC] pt-7 pb-8 px-5 rounded-b-[28px] border-b border-[#DCDCDC]">
          <View className="items-center mb-6">
            <View className="bg-[#B8860B]/12 border border-[#B8860B]/25 px-3.5 py-1 rounded-full mb-3">
              <Text className="font-inter-semibold text-[#B8860B] text-xs uppercase tracking-wider">
                Alojamientos verificados
              </Text>
            </View>
            <Text className="font-poppins font-semibold text-3xl text-[#1C1C1C] mb-2.5 text-center leading-9">
              Encuentra tu Hospedaje Perfecto
            </Text>
            <Text className="font-inter text-[#595959] text-sm text-center px-2 leading-5 mb-4">
              Explora propiedades únicas en los mejores destinos con calma y confianza
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleHostCta}
              className="min-h-[44px] justify-center bg-white px-4 py-2 rounded-full border border-[#DCDCDC]"
            >
              <Text className="font-inter-medium text-[#B87333] text-xs">
                ¿Eres anfitrión? Publica tu espacio
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Card */}
          <View className="bg-white rounded-2xl p-4 border border-[#DCDCDC] shadow-sm">
            {/* Campo 1: Destino o Título */}
            <View
              className={`flex-row items-center rounded-xl px-3.5 py-2 border mb-3 ${
                focusedField === "destino"
                  ? "border-[#B8860B] bg-white"
                  : "border-[#DCDCDC] bg-[#FAFAFA]"
              }`}
            >
              <View className="w-9 h-9 rounded-xl bg-[#F5F2EC] items-center justify-center mr-3">
                <MapPin color="#B87333" size={18} />
              </View>
              <View className="flex-1">
                <Text className="font-inter-medium text-[11px] uppercase tracking-wider text-[#595959]">
                  Destino o Título
                </Text>
                <TextInput
                  placeholder="¿Dónde vas o qué buscas?"
                  value={destino}
                  onChangeText={setDestino}
                  onFocus={() => setFocusedField("destino")}
                  onBlur={() => setFocusedField(null)}
                  placeholderTextColor="#7A7A7A"
                  className="font-inter-medium text-[#1C1C1C] text-sm py-1"
                />
              </View>
              {destino.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setDestino("")}
                  className="h-9 w-9 items-center justify-center"
                >
                  <X color="#1C1C1C" size={16} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Fila 2: Costo Máximo y Huéspedes */}
            <View className="flex-row gap-3">
              <View
                className={`flex-1 flex-row items-center rounded-xl px-3 py-2 border ${
                  focusedField === "precio"
                    ? "border-[#B8860B] bg-white"
                    : "border-[#DCDCDC] bg-[#FAFAFA]"
                }`}
              >
                <View className="w-8 h-8 rounded-lg bg-[#F5F2EC] items-center justify-center mr-2.5">
                  <DollarSign color="#B87333" size={16} />
                </View>
                <View className="flex-1">
                  <Text className="font-inter-medium text-[10px] uppercase tracking-wider text-[#595959]">
                    Costo Máx.
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="Ej. 2500"
                    value={precioMax}
                    onChangeText={setPrecioMax}
                    onFocus={() => setFocusedField("precio")}
                    onBlur={() => setFocusedField(null)}
                    placeholderTextColor="#7A7A7A"
                    className="font-inter-medium text-[#1C1C1C] text-sm py-1"
                  />
                </View>
              </View>

              <View
                className={`flex-1 flex-row items-center rounded-xl px-3 py-2 border ${
                  focusedField === "huespedes"
                    ? "border-[#B8860B] bg-white"
                    : "border-[#DCDCDC] bg-[#FAFAFA]"
                }`}
              >
                <View className="w-8 h-8 rounded-lg bg-[#F5F2EC] items-center justify-center mr-2.5">
                  <Users color="#B87333" size={16} />
                </View>
                <View className="flex-1">
                  <Text className="font-inter-medium text-[10px] uppercase tracking-wider text-[#595959]">
                    Huéspedes
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="¿Cuántos?"
                    value={huespedes}
                    onChangeText={setHuespedes}
                    onFocus={() => setFocusedField("huespedes")}
                    onBlur={() => setFocusedField(null)}
                    placeholderTextColor="#7A7A7A"
                    className="font-inter-medium text-[#1C1C1C] text-sm py-1"
                  />
                </View>
              </View>
            </View>

            {hayFiltrosActivos ? (
              <TouchableOpacity
                onPress={limpiarFiltros}
                activeOpacity={0.75}
                className="mt-3 min-h-[44px] py-2 rounded-xl bg-[#F5F2EC] border border-[#DCDCDC] flex-row items-center justify-center"
              >
                <X color="#B87333" size={15} />
                <Text className="font-inter-medium text-[#B87333] text-xs ml-1.5">
                  Limpiar filtros de búsqueda
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Catálogo de Propiedades */}
        <View
          onLayout={(e) => setCatalogOffsetY(e.nativeEvent.layout.y)}
          className="pt-8 pb-6 px-5"
        >
          <View className="flex-row items-end justify-between mb-6">
            <View className="flex-1 mr-3">
              <Text className="font-poppins font-semibold text-2xl text-[#1C1C1C] mb-1">
                Propiedades Disponibles
              </Text>
              <Text className="font-inter text-[#595959] text-sm">
                Las mejores opciones seleccionadas para ti
              </Text>
            </View>
            {!error ? (
              <View className="bg-[#F5F2EC] border border-[#DCDCDC] px-3 py-1.5 rounded-full">
                <Text className="font-inter-semibold text-[#B87333] text-xs">
                  {propiedadesFiltradas.length}{" "}
                  {propiedadesFiltradas.length === 1 ? "opción" : "opciones"}
                </Text>
              </View>
            ) : null}
          </View>

          {error ? (
            <View className="bg-red-50 border border-red-200 p-5 rounded-2xl mb-6">
              <Text className="font-poppins text-red-800 font-semibold text-base mb-1">
                No pudimos cargar el catálogo
              </Text>
              <Text className="font-inter text-red-700 text-sm leading-5 mb-4">
                {error}
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  void handleRecargar(false);
                }}
                className="min-h-[48px] bg-[#B8860B] self-start px-5 py-3 rounded-xl flex-row items-center"
              >
                <RefreshCw color="#FFFFFF" size={16} />
                <Text className="font-inter-medium text-white text-sm ml-2">
                  Reintentar conexión
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!error && propiedadesFiltradas.length === 0 ? (
            <View className="bg-white p-8 rounded-2xl items-center border border-[#DCDCDC] mt-2 shadow-sm">
              <View className="w-16 h-16 rounded-full bg-[#F5F2EC] border border-[#DCDCDC] items-center justify-center mb-4">
                <Search color="#B87333" size={28} />
              </View>
              <Text className="font-poppins font-semibold text-lg text-[#1C1C1C] mb-2 text-center">
                No encontramos resultados
              </Text>
              <Text className="font-inter text-[#595959] text-sm text-center leading-5 mb-5">
                Intenta modificando los valores del buscador o los filtros aplicados.
              </Text>
              {hayFiltrosActivos ? (
                <TouchableOpacity
                  onPress={limpiarFiltros}
                  className="min-h-[48px] bg-[#B8860B] px-5 py-3 rounded-xl justify-center"
                >
                  <Text className="font-inter-medium text-white text-sm">
                    Ver todas las propiedades
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            !error && (
              <View className="gap-5">
                {propiedadesFiltradas.map(
                  (prop: PropiedadItem, index: number): ReactElement => {
                    const id = String(
                      prop.id_propiedad ?? prop.id ?? `prop-${index}`,
                    );
                    const nombre = getPropertyTitle(prop) || "Sin nombre";
                    const ubicacion =
                      getPropertyLocation(prop) || "Ubicación no especificada";
                    const precio = getPropertyPrice(prop);
                    const capacidad = getPropertyCapacity(prop);
                    const imagen = failedImageIds[id]
                      ? PLACEHOLDER_PROPERTY_IMAGE
                      : resolvePropertyImage(prop);
                    const calificacion =
                      prop.calificacion_promedio ??
                      prop.calificacion ??
                      prop.rating ??
                      "4.9";
                    const esMensual =
                      String(
                        (prop as Record<string, any>).tipo_precio || "",
                      ).toLowerCase() === "mensual";

                    return (
                      <PropertyCard
                        key={id}
                        title={nombre}
                        location={ubicacion}
                        imageUri={imagen}
                        priceFormatted={formatPrice(precio)}
                        priceSuffix={esMensual ? "/ mes" : "/ noche"}
                        rating={calificacion}
                        capacity={capacidad}
                        actionLabel="Ver información"
                        onImageError={() => {
                          setFailedImageIds((prev) => ({
                            ...prev,
                            [id]: true,
                          }));
                        }}
                        onPress={() =>
                          router.push({
                            pathname: "/inquilino/detallesPropiedadPage" as any,
                            params: { id, from: "index", soloInfo: "true" },
                          })
                        }
                      />
                    );
                  },
                )}
              </View>
            )
          )}
        </View>

        {/* CTA Section Informativa */}
        <View className="mx-5 my-4 bg-[#B8860B] rounded-2xl py-8 px-6 items-center shadow-sm">
          <Text className="font-poppins font-semibold text-2xl text-white text-center mb-2.5">
            ¿Listo para tu próxima aventura?
          </Text>
          <Text className="font-inter text-white/90 text-sm text-center mb-6 leading-5">
            Conoce cómo miles de viajeros encuentran y consultan información de
            alojamientos verificados en nuestra plataforma
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleNavigateRegister}
            className="min-h-[48px] bg-white w-full py-3.5 rounded-xl items-center justify-center shadow-sm"
          >
            <Text className="font-inter-medium text-[#B8860B] text-base">
              Ver información de la plataforma
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer Móvil */}
        <View className="bg-white mt-4 pt-8 pb-10 px-6 border-t border-[#DCDCDC] items-center">
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 rounded-xl bg-[#B8860B] items-center justify-center mr-2">
              <Home color="#FFFFFF" size={16} />
            </View>
            <Text className="font-poppins font-semibold text-xl text-[#1C1C1C]">
              No Way Home
            </Text>
          </View>

          <Text className="font-inter text-[#595959] text-sm text-center mb-6 leading-5">
            Tu plataforma de confianza para encontrar los mejores alojamientos
            temporales. Siéntete en casa, sin importar a dónde vayas.
          </Text>

          <View className="flex-row items-center bg-[#FAFAFA] px-4 py-2.5 rounded-full border border-[#DCDCDC] mb-6">
            <Mail color="#B87333" size={16} />
            <Text className="font-inter-medium text-[#1C1C1C] text-xs ml-2">
              nowayhomeadmin@gmail.com
            </Text>
          </View>

          <View className="border-t border-[#DCDCDC] w-full pt-6 items-center">
            <Text className="font-inter text-[#595959] text-xs mb-4 text-center">
              © {new Date().getFullYear()} No Way Home. Todos los derechos
              reservados.
            </Text>
            <View className="flex-row gap-6">
              <TouchableOpacity
                onPress={() => handleOpenPdf("Privacidad")}
                className="min-h-[44px] justify-center px-2"
              >
                <Text className="font-inter-medium text-[#B87333] text-xs">
                  Privacidad
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleOpenPdf("Términos")}
                className="min-h-[44px] justify-center px-2"
              >
                <Text className="font-inter-medium text-[#B87333] text-xs">
                  Términos
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <BottomTabBar />

      {/* Modal informativo */}
      <Modal
        visible={infoModalType !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalType(null)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <View className="w-full max-w-md bg-white rounded-2xl p-6 border border-[#DCDCDC] shadow-xl max-h-[82%]">
            <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-[#DCDCDC]">
              <View className="flex-row items-center flex-1 pr-3">
                <View className="w-10 h-10 rounded-xl bg-[#F5F2EC] border border-[#DCDCDC] items-center justify-center mr-3">
                  {infoModalType === "privacidad" ||
                  infoModalType === "terminos" ? (
                    <FileText color="#B87333" size={20} />
                  ) : infoModalType === "anfitrion" ? (
                    <ShieldCheck color="#B8860B" size={20} />
                  ) : (
                    <Info color="#B8860B" size={20} />
                  )}
                </View>
                <Text className="font-poppins font-semibold text-lg text-[#1C1C1C] flex-1">
                  {infoModalType === "anfitrion"
                    ? "Información para Anfitriones"
                    : infoModalType === "aventura"
                      ? "¿Cómo funciona No Way Home?"
                      : infoModalType === "privacidad"
                        ? "Aviso de Privacidad"
                        : "Términos y Condiciones"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setInfoModalType(null)}
                className="h-10 w-10 items-center justify-center rounded-full bg-[#FAFAFA] border border-[#DCDCDC]"
              >
                <X color="#1C1C1C" size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              className="mb-5"
            >
              {infoModalType === "anfitrion" ? (
                <View className="gap-3">
                  <Text className="font-inter text-[#1C1C1C] text-sm leading-5">
                    En No Way Home los propietarios y anfitriones pueden dar a
                    conocer sus espacios verificados con fotografías reales,
                    ubicación en mapa y tarifas transparentes por noche o por
                    mes.
                  </Text>
                  <View className="bg-[#F5F2EC] p-4 rounded-xl border border-[#DCDCDC]">
                    <Text className="font-poppins font-semibold text-[#1C1C1C] text-sm mb-1.5">
                      Beneficios informativos para anfitriones:
                    </Text>
                    <Text className="font-inter text-[#595959] text-xs leading-5">
                      • Publicación detallada con galería de entre 5 y 20
                      fotografías.{"\n"}• Geolocalización interactiva para que
                      los interesados ubiquen la zona fácilmente.{"\n"}•
                      Control de solicitudes de estadía con aprobación o rechazo
                      directo desde tu cuenta de anfitrión.{"\n"}• Recepción de
                      pagos verificados y emisión de constancia digital.
                    </Text>
                  </View>
                  <Text className="font-inter text-[#595959] text-xs leading-5">
                    Nota: Esta pantalla de inicio es únicamente de carácter
                    informativo. Para gestionar o publicar alojamientos, accede
                    con tu cuenta de anfitrión desde el menú superior.
                  </Text>
                </View>
              ) : infoModalType === "aventura" ? (
                <View className="gap-3">
                  <Text className="font-inter text-[#1C1C1C] text-sm leading-5">
                    No Way Home conecta a viajeros con alojamientos temporales
                    verificados de manera transparente y segura.
                  </Text>
                  <View className="bg-[#F5F2EC] p-4 rounded-xl border border-[#DCDCDC]">
                    <Text className="font-poppins font-semibold text-[#1C1C1C] text-sm mb-1.5">
                      Guía informativa del servicio:
                    </Text>
                    <Text className="font-inter text-[#595959] text-xs leading-5">
                      1. Consulta en este catálogo público las características,
                      ubicación, capacidad y precios de cada propiedad.{"\n"}2.
                      Las reservaciones únicamente pueden realizarse iniciando
                      sesión con una cuenta de huésped (inquilino) desde la
                      sección Explorar de tu perfil.{"\n"}3. Una vez solicitada
                      una estancia, el anfitrión revisa y confirma la
                      disponibilidad.{"\n"}4. Al aprobarse la solicitud, el
                      pago se procesa de forma segura mediante PayPal y se
                      genera tu Constancia de Reserva digital.
                    </Text>
                  </View>
                </View>
              ) : infoModalType === "privacidad" ? (
                <View className="gap-3">
                  <Text className="font-inter text-[#1C1C1C] text-sm leading-5">
                    En No Way Home protegemos tus datos personales conforme a la
                    normativa aplicable de protección de datos.
                  </Text>
                  <Text className="font-inter text-[#595959] text-xs leading-5">
                    • Recopilación de datos: únicamente solicitamos nombre,
                    correo electrónico y teléfono necesarios para identificar a
                    huéspedes y anfitriones.{"\n"}• Uso de la información: los
                    datos se emplean exclusivamente para la gestión de perfiles,
                    comunicación de reservas y emisión de constancias de
                    estancia.{"\n"}• Seguridad en pagos: las transacciones se
                    procesan directamente en la pasarela segura de PayPal sin
                    almacenar datos bancarios sensibles en el dispositivo.{"\n"}
                    • Contacto: nowayhomeadmin@gmail.com.
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  <Text className="font-inter text-[#1C1C1C] text-sm leading-5">
                    El uso de la plataforma No Way Home implica la aceptación de
                    las siguientes condiciones informativas y de servicio:
                  </Text>
                  <Text className="font-inter text-[#595959] text-xs leading-5">
                    • Catálogo de inicio: la página principal muestra
                    información general de los alojamientos disponibles únicamente
                    para consulta informativa.{"\n"}• Proceso de reserva: toda
                    solicitud requiere cuenta activa de huésped y está sujeta a
                    la aprobación del anfitrión.{"\n"}• Pagos y constancias:
                    una vez aprobada la reserva por el anfitrión, el huésped
                    completa el pago mediante PayPal para obtener su constancia
                    verificada.{"\n"}• Cancelaciones: las solicitudes pueden
                    cancelarse conforme a las políticas vigentes indicando el
                    motivo correspondiente.
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setInfoModalType(null)}
              className="min-h-[48px] bg-[#B8860B] py-3.5 rounded-xl items-center justify-center"
            >
              <Text className="font-inter-medium text-white text-sm">
                Entendido
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
