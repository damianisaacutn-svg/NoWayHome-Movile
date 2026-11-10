import { useRouter, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  DollarSign,
  Home,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  Star,
  Users,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useState, type ReactElement } from "react";
import {
  ActivityIndicator,
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

import { API_BASE_URL } from "@/config/api";

// ============================================================================
// [UBICACIÓN 1 - IMPORTACIÓN DEL HEADER]
// Aquí importamos el componente `Header` desde `src/components/header.tsx`
// usando el alias `@/components/header` para reutilizarlo en cualquier pantalla.
// ============================================================================
import { Header } from "@/components/header";
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
    prop.direccion ||
    prop.ciudad ||
    prop.location ||
    prop.address ||
    prop.city ||
    ""
  );
}

function getPropertyPrice(prop: PropiedadItem): number {
  return parseNumericValue(
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

  // Resuelve rutas relativas servidas desde el backend (ej. /uploads/foto.jpg)
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export default function HomePage(): ReactElement {
  const router = useRouter();
  const [propiedades, setPropiedades] = useState<PropiedadItem[]>([]);
  const [destino, setDestino] = useState<string>("");
  const [precioMax, setPrecioMax] = useState<string>("");
  const [huespedes, setHuespedes] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>(
    {},
  );

  const cargarCatalogo = useCallback(async (): Promise<PropiedadItem[]> => {
    const result = await propiedadController.cargarPropiedades();

    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }

    throw new Error(
      result.error || "No se pudieron cargar las propiedades disponibles.",
    );
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async (): Promise<void> => {
      try {
        const data = await cargarCatalogo();
        if (isMounted) {
          setPropiedades(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
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

    void init();
    return () => {
      isMounted = false;
    };
  }, [cargarCatalogo]);

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

  // Filtrado tridimensional en tiempo real en base a los 3 campos
  const propiedadesFiltradas = propiedades.filter(
    (prop: PropiedadItem): boolean => {
      // 1. Filtro por texto (Destino / Título)
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

      // 2. Filtro por Costo deseado (Precio Máximo)
      const maxPrice = parseFloat(precioMax);
      const matchPrecio = ((): boolean => {
        if (isNaN(maxPrice) || maxPrice <= 0) return true;
        const precioProp = getPropertyPrice(prop);
        return precioProp <= maxPrice;
      })();

      // 3. Filtro por Número de Huéspedes
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
    Alert.alert(
      "Aviso",
      `En la versión móvil, los PDFs de ${tipo} se abrirán externamente en una futura actualización.`,
    );
  };

  const handleNavigateRegister = (): void => {
    router.push("/registerPage" as Href);
  };

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["top", "left", "right"]}
      >
        <StatusBar style="dark" />

        {/* ==================================================================
            [UBICACIÓN 2 - HEADER EN EL ESTADO DE CARGA (isLoading)]
            Cómo se colocó:
            - Dentro de `<SafeAreaView className="flex-1 bg-white">` para que
              respete el notch/barra de estado en blanco igual que el Header.
            - Justo arriba del contenedor del spinner de carga para mantener la
              barra superior visible mientras se consultan las propiedades.
            ================================================================== */}
        <Header />

        <View className="flex-1 bg-[#FAFAFA] items-center justify-center px-6">
          <View className="w-16 h-16 rounded-2xl bg-cream items-center justify-center mb-4">
            <ActivityIndicator size="large" color="#6B8E23" />
          </View>
          <Text className="text-dark font-bold text-lg text-center">
            No Way Home
          </Text>
          <Text className="mt-1 text-dark/70 font-medium text-sm text-center">
            Buscando alojamientos disponibles...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <StatusBar style="dark" />

      {/* ====================================================================
          [UBICACIÓN 3 - HEADER EN LA VISTA PRINCIPAL DE INDEX]
          Dónde está:
          - Dentro de `<SafeAreaView className="flex-1 bg-white">` y ANTES
            (por fuera) del `<ScrollView>`.
          Cómo funciona así:
          - Al estar fuera del `<ScrollView>`, el `<Header />` permanece fijo
            en la parte superior mientras el usuario hace scroll al catálogo,
            y su menú desplegable móvil se abre limpiamente sin recortarse.
          ==================================================================== */}
      <Header />

      <ScrollView
        className="flex-1 bg-[#FAFAFA]"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void handleRecargar(true);
            }}
            colors={["#6B8E23"]}
            tintColor="#6B8E23"
          />
        }
      >
        {/* Hero Section */}
        <View className="bg-cream pt-7 pb-8 px-5 rounded-b-[32px]">
          {/* Hero Copy */}
          <View className="items-center mb-6">
            <View className="bg-brand/15 px-3 py-1 rounded-full mb-3">
              <Text className="text-brand text-xs font-bold uppercase tracking-wider">
                Alojamientos verificados
              </Text>
            </View>
            <Text className="font-bold text-3xl text-dark mb-2.5 text-center leading-9">
              Encuentra tu Hospedaje Perfecto
            </Text>
            <Text className="text-dark/80 text-sm text-center px-2 leading-5 mb-4">
              Explora miles de propiedades únicas en los mejores destinos
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleNavigateRegister}
              className="bg-white/90 px-4 py-2 rounded-full border border-brand/20"
            >
              <Text className="text-brown text-xs font-bold">
                ¿Eres anfitrión? Publica tu espacio
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Card */}
          <View className="bg-white rounded-3xl p-4 border border-brand/15 shadow-sm">
            {/* Campo 1: Destino o Título */}
            <View className="flex-row items-center bg-[#FAFAFA] rounded-2xl px-3.5 py-2.5 border border-[#EBE5D8] mb-3">
              <View className="w-9 h-9 rounded-xl bg-cream/70 items-center justify-center mr-3">
                <MapPin color="#A67C52" size={18} />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-bold uppercase tracking-wider text-dark/60">
                  Destino o Título
                </Text>
                <TextInput
                  placeholder="¿Dónde vas o qué buscas?"
                  value={destino}
                  onChangeText={setDestino}
                  placeholderTextColor="#5F5F5F70"
                  className="text-dark text-sm font-medium py-0.5"
                />
              </View>
              {destino.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setDestino("")}
                  className="p-1"
                >
                  <X color="#5F5F5F" size={16} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Fila 2: Costo Máximo y Huéspedes lado a lado en móvil */}
            <View className="flex-row gap-3">
              <View className="flex-1 flex-row items-center bg-[#FAFAFA] rounded-2xl px-3 py-2.5 border border-[#EBE5D8]">
                <View className="w-8 h-8 rounded-xl bg-cream/70 items-center justify-center mr-2.5">
                  <DollarSign color="#A67C52" size={16} />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-dark/60">
                    Costo Máx.
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="Ej. 2500"
                    value={precioMax}
                    onChangeText={setPrecioMax}
                    placeholderTextColor="#5F5F5F70"
                    className="text-dark text-sm font-medium py-0.5"
                  />
                </View>
              </View>

              <View className="flex-1 flex-row items-center bg-[#FAFAFA] rounded-2xl px-3 py-2.5 border border-[#EBE5D8]">
                <View className="w-8 h-8 rounded-xl bg-cream/70 items-center justify-center mr-2.5">
                  <Users color="#A67C52" size={16} />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-dark/60">
                    Huéspedes
                  </Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="¿Cuántos?"
                    value={huespedes}
                    onChangeText={setHuespedes}
                    placeholderTextColor="#5F5F5F70"
                    className="text-dark text-sm font-medium py-0.5"
                  />
                </View>
              </View>
            </View>

            {hayFiltrosActivos ? (
              <TouchableOpacity
                onPress={limpiarFiltros}
                activeOpacity={0.75}
                className="mt-3 py-2 rounded-xl bg-cream/60 flex-row items-center justify-center"
              >
                <X color="#A67C52" size={14} />
                <Text className="text-brown font-bold text-xs ml-1.5">
                  Limpiar filtros de búsqueda
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Catálogo de Propiedades */}
        <View className="pt-8 pb-6 px-5">
          <View className="flex-row items-end justify-between mb-6">
            <View className="flex-1 mr-3">
              <Text className="font-bold text-2xl text-dark mb-1">
                Propiedades Disponibles
              </Text>
              <Text className="text-dark/70 text-sm">
                Las mejores opciones seleccionadas para ti
              </Text>
            </View>
            {!error ? (
              <View className="bg-cream px-3 py-1.5 rounded-full">
                <Text className="text-brown font-bold text-xs">
                  {propiedadesFiltradas.length}{" "}
                  {propiedadesFiltradas.length === 1 ? "opción" : "opciones"}
                </Text>
              </View>
            ) : null}
          </View>

          {error ? (
            <View className="bg-red-50 border border-red-200 p-5 rounded-2xl mb-6">
              <Text className="text-red-800 font-bold text-base mb-1">
                No pudimos cargar el catálogo
              </Text>
              <Text className="text-red-600 text-sm leading-5 mb-4">
                {error}
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  void handleRecargar(false);
                }}
                className="bg-brand self-start px-4 py-2.5 rounded-xl flex-row items-center"
              >
                <RefreshCw color="#FFFFFF" size={15} />
                <Text className="text-white font-bold text-xs ml-2">
                  Reintentar conexión
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!error && propiedadesFiltradas.length === 0 ? (
            <View className="bg-white p-8 rounded-3xl items-center border border-brand/15 mt-2 shadow-sm">
              <View className="w-16 h-16 rounded-full bg-cream/70 items-center justify-center mb-4">
                <Search color="#A67C52" size={28} />
              </View>
              <Text className="font-bold text-lg text-dark mb-2 text-center">
                No encontramos resultados
              </Text>
              <Text className="text-dark/70 text-sm text-center leading-5 mb-5">
                Intenta modificando los valores del buscador o los filtros
                aplicados.
              </Text>
              {hayFiltrosActivos ? (
                <TouchableOpacity
                  onPress={limpiarFiltros}
                  className="bg-brand px-5 py-2.5 rounded-xl"
                >
                  <Text className="text-white font-bold text-sm">
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

                    return (
                      <TouchableOpacity
                        key={id}
                        activeOpacity={0.9}
                        onPress={() =>
                          router.push({
                            pathname: "/inquilino/detallesPropiedadPage" as any,
                            params: { id },
                          })
                        }
                        className="bg-white rounded-3xl overflow-hidden border border-brand/15 shadow-sm"
                      >
                        {/* Contenedor de imagen con altura fija para renderizado nativo confiable */}
                        <View className="h-52 w-full bg-cream/40 relative">
                          <Image
                            source={{ uri: imagen }}
                            className="w-full h-full"
                            resizeMode="cover"
                            onError={() => {
                              setFailedImageIds((prev) => ({
                                ...prev,
                                [id]: true,
                              }));
                            }}
                          />

                          {/* Badge de calificación flotante */}
                          <View className="absolute top-3 right-3 flex-row items-center bg-white/95 px-2.5 py-1 rounded-full shadow-sm">
                            <Star color="#6B8E23" fill="#6B8E23" size={13} />
                            <Text className="text-xs font-bold text-dark ml-1">
                              {calificacion}
                            </Text>
                          </View>

                          {/* Badge de capacidad si existe */}
                          {capacidad > 0 ? (
                            <View className="absolute bottom-3 left-3 flex-row items-center bg-black/60 px-2.5 py-1 rounded-full">
                              <Users color="#FFFFFF" size={12} />
                              <Text className="text-[11px] font-medium text-white ml-1">
                                Hasta {capacidad} huéspedes
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View className="p-5">
                          <Text
                            className="font-bold text-lg text-dark leading-6 mb-1.5"
                            numberOfLines={2}
                          >
                            {nombre}
                          </Text>

                          <View className="flex-row items-center mb-4">
                            <MapPin color="#A67C52" size={15} />
                            <Text
                              className="text-dark/70 ml-1.5 text-sm flex-1"
                              numberOfLines={1}
                            >
                              {ubicacion}
                            </Text>
                          </View>

                          <View className="border-t border-cream pt-3.5 flex-row items-center justify-between">
                            <View className="flex-row items-baseline">
                              <Text className="font-bold text-xl text-brand">
                                {formatPrice(precio)}
                              </Text>
                              <Text className="text-xs font-medium text-dark/60 ml-1">
                                / noche
                              </Text>
                            </View>

                            <View className="bg-cream/70 px-3.5 py-1.5 rounded-xl">
                              <Text className="text-brown font-bold text-xs">
                                Ver detalles
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>
            )
          )}
        </View>

        {/* CTA Section */}
        <View className="mx-5 my-4 bg-brand rounded-3xl py-8 px-6 items-center shadow-sm">
          <Text className="font-bold text-2xl text-white text-center mb-2.5">
            ¿Listo para tu próxima aventura?
          </Text>
          <Text className="text-white/90 text-sm text-center mb-6 leading-5">
            Únete a miles de viajeros que confían en nosotros para encontrar su
            hospedaje ideal
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleNavigateRegister}
            className="bg-white w-full py-3.5 rounded-2xl items-center justify-center shadow-sm"
          >
            <Text className="text-brand font-bold text-base">
              Comenzar ahora
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer Móvil */}
        <View className="bg-white mt-4 pt-8 pb-10 px-6 border-t border-brand/10 items-center">
          <View className="flex-row items-center mb-3">
            <View className="w-7 h-7 rounded-lg bg-brand items-center justify-center mr-2">
              <Home color="#FFFFFF" size={14} />
            </View>
            <Text className="font-bold text-xl text-brand">No Way Home</Text>
          </View>

          <Text className="text-dark/70 text-sm text-center mb-6 leading-5">
            Tu plataforma de confianza para encontrar los mejores alojamientos
            temporales. Siéntete en casa, sin importar a dónde vayas.
          </Text>

          <View className="flex-row items-center bg-[#FAFAFA] px-4 py-2.5 rounded-full border border-cream mb-6">
            <Mail color="#A67C52" size={16} />
            <Text className="text-dark/80 text-xs font-medium ml-2">
              nowayhomeadmin@gmail.com
            </Text>
          </View>

          <View className="border-t border-brand/10 w-full pt-6 items-center">
            <Text className="text-dark/60 text-xs mb-4 text-center">
              © {new Date().getFullYear()} No Way Home. Todos los derechos
              reservados.
            </Text>
            <View className="flex-row gap-6">
              <TouchableOpacity onPress={() => handleOpenPdf("Privacidad")}>
                <Text className="text-brown font-medium text-xs">
                  Privacidad
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleOpenPdf("Términos")}>
                <Text className="text-brown font-medium text-xs">Términos</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
