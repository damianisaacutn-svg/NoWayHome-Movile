import { propiedadService } from "@/services/propiedadService";

export const propiedadController = {
  cargarPropiedades: async () => {
    try {
      const data = await propiedadService.obtenerPropiedadesDisponibles();
      return { success: true, data: Array.isArray(data) ? data : [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  cargarDetallesPropiedad: async (id) => {
    try {
      const data = await propiedadService.obtenerPropiedadPorId(String(id));
      return { success: true, data: data ?? null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
