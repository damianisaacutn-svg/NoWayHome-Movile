/**
 * Guía de estilos "Calma Urbana" - No Way Home Mobile (Fase 5 - UI)
 * Paleta cromática, tipografía, espaciados y métricas táctiles consistentes.
 */

export const THEME_COLORS = {
  // Colores principales de la Fase 5
  primary: "#B8860B", // Ocre dorado: acciones principales, selección activa, CTA y precios destacados
  primaryPressed: "#9A6F09",
  primarySoft: "rgba(184, 134, 11, 0.12)",

  secondary: "#DCDCDC", // Gris cemento claro: bordes, superficies secundarias, placeholders y deshabilitados
  secondarySoft: "#ECECEC",

  accent: "#B87333", // Cobre oxidado: iconografía secundaria, detalles visuales y elementos de apoyo
  accentSoft: "rgba(184, 115, 51, 0.12)",

  textMain: "#1C1C1C", // Negro mate: títulos, cuerpo de texto y elementos de alto contraste
  textMuted: "#595959", // Texto secundario legible sobre #FAFAFA / #FFFFFF
  placeholder: "#7A7A7A",

  background: "#FAFAFA", // Off-White: fondo general y base visual de la aplicación
  surface: "#FFFFFF", // Superficie de tarjetas, modales y barra de navegación
  surfaceWarm: "#F5F2EC", // Superficie cálida neutra para bloques destacados y resúmenes

  // Semánticos de retroalimentación (siempre acompañados de icono y texto)
  success: "#16A34A",
  successBg: "#F0FDF4",
  successBorder: "#BBF7D0",
  warning: "#D97706",
  warningBg: "#FFFBEB",
  warningBorder: "#FDE68A",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  dangerBorder: "#FECACA",
} as const;

export const THEME_FONTS = {
  heading: "Poppins_600SemiBold",
  headingBold: "Poppins_700Bold",
  body: "Inter_400Regular",
  label: "Inter_500Medium",
  labelSemibold: "Inter_600SemiBold",
} as const;

export const THEME_METRICS = {
  touchMinHeight: 48,
  radiusButton: 12,
  radiusInput: 12,
  radiusCard: 16,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
} as const;
