import { inquilinoService } from '../services/inquilinoService'

export const inquilinoController = {
  cargarPerfilCompleto: async id_inquilino => {
    const [perfilResult] = await Promise.allSettled([
      inquilinoService.obtenerPerfilCompleto(id_inquilino),
    ])

    if (perfilResult.status === 'rejected') {
      console.error('Error al obtener perfil de inquilino:', perfilResult.reason)
      return {
        success: false,
        error: perfilResult.reason?.message || String(perfilResult.reason),
      }
    }

    const perfilCompleto = perfilResult.value

    return {
      success: true,
      data: {
        perfil: perfilCompleto.perfil,
        reservas: perfilCompleto.reservas || [],
        favoritos: perfilCompleto.favoritos || [],
      },
    }
  },

  actualizarPerfil: async (id_inquilino, updates) => {
    try {
      const perfil = await inquilinoService.actualizarPerfil(id_inquilino, updates)
      return { success: true, data: perfil }
    } catch (error) {
      console.error('Error actualizando perfil de inquilino:', error)
      return { success: false, error: error.message }
    }
  },
}
