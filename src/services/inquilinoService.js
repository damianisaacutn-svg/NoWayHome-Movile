import { tenantService } from '@/services/tenantService'

export const inquilinoService = {
  obtenerPerfil: tenantService.obtenerPerfil,
  actualizarPerfil: tenantService.actualizarPerfil,
  obtenerReservas: tenantService.obtenerReservas,
  obtenerFavoritos: tenantService.obtenerFavoritos,
  obtenerPerfilCompleto: tenantService.obtenerPerfilCompleto,
}
