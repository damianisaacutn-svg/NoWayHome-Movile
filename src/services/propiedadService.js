import { tenantPropertyService } from "@/services/tenantPropertyService";

export const propiedadService = {
  obtenerPropiedadesDisponibles:
    tenantPropertyService.obtenerPropiedadesDisponibles,
  obtenerPropiedadPorId: tenantPropertyService.obtenerPropiedadPorId,
};
