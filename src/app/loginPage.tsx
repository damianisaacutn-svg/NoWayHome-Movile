import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Key,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Header } from "@/components/header";
import { authController } from "../controllers/authController";
import { authService } from "../services/authService";

/*
|--------------------------------------------------------------------------
| Helper para detectar y normalizar el rol del usuario al iniciar sesión
|--------------------------------------------------------------------------
| En la aplicación móvil solo se permite el acceso a "inquilino" (huésped)
| y "arrendatario" (anfitrión).
*/
function detectarRolUsuario(
  resultOrUser: any,
  fallbackRole = "",
): "inquilino" | "arrendatario" {
  const userObj =
    resultOrUser?.user ||
    resultOrUser?.usuario ||
    resultOrUser?.data ||
    resultOrUser?.profile ||
    resultOrUser ||
    {};
  const rawRole = String(
    resultOrUser?.role ||
      resultOrUser?.rol ||
      resultOrUser?.tipo ||
      userObj?.role ||
      userObj?.rol ||
      userObj?.tipo ||
      fallbackRole ||
      "",
  )
    .trim()
    .toLowerCase();

  if (
    rawRole === "arrendatario" ||
    rawRole === "arrendador" ||
    rawRole === "host" ||
    rawRole === "anfitrion" ||
    rawRole === "anfitrión" ||
    Boolean(userObj?.id_arrendatario) ||
    Boolean(resultOrUser?.id_arrendatario)
  ) {
    return "arrendatario";
  }

  return "inquilino";
}

export default function LoginPage() {
  const router = useRouter();
  const PENDING_2FA_KEY = "pending_2fa";
  const LAST_REGISTERED_KEY = "last_registered_user";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"credentials" | "verify">("credentials");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingRole, setPendingRole] = useState("");
  const [registeredFallback, setRegisteredFallback] = useState<any>(null);

  useEffect(() => {
    const initLoginState = () => {
      try {
        // 1. Si el usuario viene de registrarse en `registerpage.tsx`,
        //    pre-llenamos su correo y recordamos el rol con el que se registró.
        const rawRegistered = authService.getStorageItem(LAST_REGISTERED_KEY);
        if (rawRegistered) {
          const parsedRegistered = JSON.parse(rawRegistered);
          setRegisteredFallback(parsedRegistered);
          if (parsedRegistered?.email) {
            setEmail(parsedRegistered.email);
          }
        }

        // 2. Revisamos si hay una verificación 2FA pendiente
        const rawPending = authService.getStorageItem(PENDING_2FA_KEY);
        if (!rawPending) return;

        const pending = JSON.parse(rawPending);
        if (!pending?.email || !pending?.role) {
          authService.removeStorageItem(PENDING_2FA_KEY);
          return;
        }

        setEmail(pending.email);
        setPendingRole(pending.role);
        setStep("verify");
      } catch {
        authService.removeStorageItem(PENDING_2FA_KEY);
      }
    };

    initLoginState();
  }, []);

  const clearPending2FA = async () => {
    authService.removeStorageItem(PENDING_2FA_KEY);
  };

  const clearFinalSessions = async () => {
    authService.removeStorageItem("user");
  };

  // ==========================================================================
  // REDIRECCIÓN SEGÚN EL TIPO DE USUARIO (SOLO INQUILINO / ANFITRIÓN)
  // ==========================================================================
  const redirectByRole = (role: "inquilino" | "arrendatario") => {
    if (role === "arrendatario") {
      router.replace("/arrendatario/profileArrendatario" as any);
      return;
    }

    // Perfil de Inquilino / Huésped -> Redirige al inicio (catálogo)
    router.replace("/" as any);
  };

  // Guarda la sesión normalizada en authService y redirige según el rol
  const completeSessionAndRedirect = async (
    resultPayload: any,
    fallbackRole = "",
  ) => {
    const cleanEmail = email.trim().toLowerCase();
    const matchingRegistered =
      registeredFallback &&
      String(registeredFallback.email || "").toLowerCase() === cleanEmail
        ? registeredFallback
        : null;

    const resolvedRole = detectarRolUsuario(
      resultPayload,
      fallbackRole || matchingRegistered?.role || "inquilino",
    );

    const rawUser =
      resultPayload?.user ||
      resultPayload?.usuario ||
      resultPayload?.data ||
      resultPayload?.profile ||
      resultPayload ||
      {};

    const normalizedUser = {
      ...matchingRegistered,
      ...rawUser,
      id:
        rawUser.id ??
        rawUser.id_inquilino ??
        rawUser.id_arrendatario ??
        resultPayload?.id ??
        matchingRegistered?.id,
      id_inquilino:
        resolvedRole === "inquilino"
          ? (rawUser.id_inquilino ??
            rawUser.id ??
            resultPayload?.id_inquilino ??
            resultPayload?.id ??
            matchingRegistered?.id_inquilino ??
            matchingRegistered?.id)
          : rawUser.id_inquilino,
      id_arrendatario:
        resolvedRole === "arrendatario"
          ? (rawUser.id_arrendatario ??
            rawUser.id ??
            resultPayload?.id_arrendatario ??
            resultPayload?.id ??
            matchingRegistered?.id_arrendatario ??
            matchingRegistered?.id)
          : rawUser.id_arrendatario,
      nombre:
        rawUser.nombre ||
        rawUser.name ||
        matchingRegistered?.nombre ||
        matchingRegistered?.name ||
        "Usuario",
      correo: rawUser.correo || rawUser.email || cleanEmail,
      telefono:
        rawUser.telefono ||
        rawUser.phone ||
        matchingRegistered?.telefono ||
        matchingRegistered?.phone ||
        "",
      role: resolvedRole,
    };

    await clearFinalSessions();
    await clearPending2FA();

    authService.setStorageItem("user", JSON.stringify(normalizedUser));

    authService.setSession({
      ...resultPayload,
      user: normalizedUser,
      role: resolvedRole,
      token: resultPayload?.token || resultPayload?.accessToken || null,
    });

    redirectByRole(resolvedRole);
  };

  const handleSubmit = async () => {
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (step === "credentials") {
      if (!cleanEmail || !password) {
        setError("Por favor ingresa tu correo y contraseña.");
        return;
      }
    } else if (!verificationCode.trim() || verificationCode.trim().length < 6) {
      setError("Por favor ingresa el código de verificación de 6 dígitos.");
      return;
    }

    setIsLoading(true);

    try {
      if (step === "credentials") {
        await clearPending2FA();

        const loginResult = await authController.login(cleanEmail, password);

        // Caso 1: El backend solicita verificación en 2 pasos (2FA)
        if (loginResult.success && loginResult.requires2FA) {
          const detectedRole = detectarRolUsuario(
            loginResult,
            registeredFallback?.role || "inquilino",
          );
          setPendingRole(detectedRole);
          authService.setStorageItem(
            PENDING_2FA_KEY,
            JSON.stringify({
              email: cleanEmail,
              role: detectedRole,
              createdAt: Date.now(),
            }),
          );
          setStep("verify");
          setVerificationCode("");
          return;
        }

        // Caso 2: El backend inicia sesión directamente sin requerir 2FA
        if (loginResult.success) {
          await completeSessionAndRedirect(loginResult);
          return;
        }

        setError(
          loginResult.message ||
            "Credenciales incorrectas. Verifica tu correo y contraseña.",
        );
        return;
      }

      // Caso 3: Verificación del código 2FA de 6 dígitos
      const verifyResult = await authController.verify2FA(
        cleanEmail,
        verificationCode.trim(),
        pendingRole || "inquilino",
      );

      if (!verifyResult.success) {
        setError(verifyResult.message || "Código inválido o expirado.");
        return;
      }

      await completeSessionAndRedirect(verifyResult, pendingRole);
    } catch (err: any) {
      setError(err.message || "Error inesperado al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <Header />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-[#FAFAFA]"
      >
        <View className="flex-1 items-center justify-center px-5 py-10">
          {/* Card principal */}
          <View className="w-full max-w-md p-6 bg-white border border-[#6B8E23]/15 shadow-sm rounded-3xl">
            <View className="items-center mb-8">
              <Text className="font-bold text-3xl text-[#5F5F5F] mb-2 text-center">
                Bienvenido de nuevo
              </Text>
              <Text className="text-[#5F5F5F]/70 text-base text-center">
                Inicia sesión para continuar
              </Text>
            </View>

            {step === "credentials" ? (
              <View>
                {/* Campo Correo */}
                <View className="mb-4">
                  <Text className="text-[#5F5F5F] font-medium mb-1.5">
                    Correo electrónico
                  </Text>
                  <View className="relative justify-center">
                    <View className="absolute left-4 z-10">
                      <Mail color="#A67C52" size={20} />
                    </View>
                    <TextInput
                      id="email"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholder="correo@ejemplo.com"
                      placeholderTextColor="#5F5F5F55"
                      value={email}
                      onChangeText={setEmail}
                      className="pl-12 pr-4 h-12 bg-[#FAFAFA] border border-[#6B8E23]/20 focus:border-[#6B8E23] rounded-xl text-[#5F5F5F]"
                    />
                  </View>
                </View>

                {/* Campo Contraseña */}
                <View className="mb-4">
                  <Text className="text-[#5F5F5F] font-medium mb-1.5">
                    Contraseña
                  </Text>
                  <View className="relative justify-center">
                    <View className="absolute left-4 z-10">
                      <Lock color="#A67C52" size={20} />
                    </View>
                    <TextInput
                      id="password"
                      secureTextEntry={!showPassword}
                      placeholder="Escribe tu contraseña"
                      placeholderTextColor="#5F5F5F55"
                      value={password}
                      onChangeText={setPassword}
                      className="pl-12 pr-12 h-12 bg-[#FAFAFA] border border-[#6B8E23]/20 focus:border-[#6B8E23] rounded-xl text-[#5F5F5F]"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      className="absolute right-4 z-10 p-1"
                    >
                      {showPassword ? (
                        <EyeOff color="#5F5F5F88" size={20} />
                      ) : (
                        <Eye color="#5F5F5F88" size={20} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Recordarme & Olvidé contraseña */}
                <View className="flex-row items-center justify-between mb-6 mt-1">
                  <TouchableOpacity
                    onPress={() => setRememberMe(!rememberMe)}
                    className="flex-row items-center gap-2"
                  >
                    <View
                      className={`w-5 h-5 rounded border border-[#6B8E23]/40 items-center justify-center ${
                        rememberMe ? "bg-[#6B8E23]" : "bg-[#FAFAFA]"
                      }`}
                    >
                      {rememberMe && (
                        <Text className="text-white text-xs font-bold">✓</Text>
                      )}
                    </View>
                    <Text className="text-[#5F5F5F] text-sm">Recordarme</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => router.push("/forgotPassword" as any)}
                    className="flex-row items-center py-1.5 px-2.5 rounded-lg bg-[#6B8E23]/10"
                  >
                    <Key color="#6B8E23" size={14} />
                    <Text className="text-[#6B8E23] font-medium text-xs ml-1.5">
                      Olvidé mi contraseña
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="items-center mb-6">
                <View className="mb-3">
                  <ShieldCheck color="#6B8E23" size={48} />
                </View>
                <View className="items-center mb-4">
                  <Text className="font-semibold text-xl text-[#5F5F5F] text-center mb-1">
                    Verificación en dos pasos
                  </Text>
                  <Text className="text-sm text-[#5F5F5F]/75 text-center">
                    Ingresa el código de 6 dígitos enviado a {email}.
                  </Text>
                </View>

                <TextInput
                  id="verification-code"
                  keyboardType="numeric"
                  maxLength={6}
                  placeholder="000000"
                  placeholderTextColor="#5F5F5F55"
                  value={verificationCode}
                  onChangeText={(text) =>
                    setVerificationCode(text.replace(/\D/g, ""))
                  }
                  className="w-full h-14 text-center text-2xl tracking-[0.4em] bg-[#FAFAFA] border border-[#6B8E23]/20 rounded-xl text-[#5F5F5F] font-semibold mb-4"
                />

                <TouchableOpacity
                  onPress={async () => {
                    await clearPending2FA();
                    setStep("credentials");
                    setVerificationCode("");
                    setPendingRole("");
                    setError("");
                  }}
                  className="py-2 px-4 rounded-lg bg-[#6B8E23]/10"
                >
                  <Text className="text-[#6B8E23] font-medium text-sm">
                    Volver al login
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Botón de Enviar */}
            <TouchableOpacity
              disabled={isLoading}
              onPress={handleSubmit}
              className={`w-full bg-[#6B8E23] h-12 rounded-xl flex-row items-center justify-center mt-2 ${
                isLoading ? "opacity-50" : ""
              }`}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text className="text-white font-medium text-base mr-2">
                    {step === "credentials"
                      ? "Iniciar sesión"
                      : "Verificar y entrar"}
                  </Text>
                  <ArrowRight color="#FFFFFF" size={20} />
                </>
              )}
            </TouchableOpacity>

            {/* Alerta de Error */}
            {error ? (
              <View className="flex-row items-center p-3 bg-red-50 border border-red-200 rounded-xl mt-4">
                <AlertCircle color="#DC2626" size={18} />
                <Text className="text-red-800 text-sm ml-2 flex-1">
                  {error}
                </Text>
              </View>
            ) : null}

            <Text className="text-xs text-center text-[#5F5F5F]/70 mt-4">
              El acceso es válido para huéspedes (inquilinos) y anfitriones
            </Text>

            {/* Registro link */}
            <View className="mt-8 items-center">
              <View className="flex-row items-center">
                <Text className="text-[#5F5F5F]">¿No tienes cuenta? </Text>
                <TouchableOpacity
                  onPress={() => router.push("/registerPage" as any)}
                >
                  <Text className="text-[#6B8E23] font-medium">
                    Regístrate aquí
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
