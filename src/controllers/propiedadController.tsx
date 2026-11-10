// src/controllers/propiedadController.tsx
import { propiedadService } from "../services/propiedadService";

export interface PropiedadImagenItem {
  id_imagen?: number | string | null;
  url?: string | null;
  imagen_url?: string | null;
  imagen?: string | null;
}

export interface PropiedadItem {
  id_propiedad?: number | string | null;
  id?: number | string | null;
  titulo?: string | null;
  titulo_propiedad?: string | null;
  nombre?: string | null;
  nombre_propiedad?: string | null;
  title?: string | null;
  name?: string | null;
  descripcion?: string | null;
  description?: string | null;
  resena?: string | null;
  ubicacion?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  pais?: string | null;
  location?: string | null;
  address?: string | null;
  city?: string | null;
  precio_noche?: number | string | null;
  precio_por_noche?: number | string | null;
  precio?: number | string | null;
  costo?: number | string | null;
  price?: number | string | null;
  pricePerNight?: number | string | null;
  price_per_night?: number | string | null;
  capacidad?: number | string | null;
  huespedes?: number | string | null;
  max_huespedes?: number | string | null;
  capacity?: number | string | null;
  guests?: number | string | null;
  maxGuests?: number | string | null;
  max_guests?: number | string | null;
  numero_habitaciones?: number | string | null;
  habitaciones?: number | string | null;
  numero_banos?: number | string | null;
  banos?: number | string | null;
  latitud?: number | string | null;
  longitud?: number | string | null;
  estado?: string | null;
  imagen_principal?: string | null;
  imagen?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  imagen_url?: string | null;
  imagenes?: (string | PropiedadImagenItem)[] | null;
  images?: (string | PropiedadImagenItem)[] | null;
  calificacion_promedio?: number | string | null;
  calificacion?: number | string | null;
  rating?: number | string | null;
  [key: string]: any;
}

export type CargarPropiedadesResult =
  | { success: true; data: PropiedadItem[]; error?: undefined }
  | { success: false; error: string; data?: undefined };

export type CargarDetallePropiedadResult =
  | { success: true; data: PropiedadItem | null; error?: undefined }
  | { success: false; error: string; data?: undefined };

export const propiedadController = {
  cargarPropiedades: async (): Promise<CargarPropiedadesResult> => {
    try {
      const data =
        (await propiedadService.obtenerPropiedadesDisponibles()) as PropiedadItem[];
      return { success: true, data: Array.isArray(data) ? data : [] };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: "Ha ocurrido un error desconocido" };
    }
  },

  cargarDetallesPropiedad: async (
    id: string | number,
  ): Promise<CargarDetallePropiedadResult> => {
    try {
      const data = (await propiedadService.obtenerPropiedadPorId(
        String(id),
      )) as PropiedadItem | null;
      return { success: true, data: data ?? null };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: "Ha ocurrido un error desconocido" };
    }
  },
};
