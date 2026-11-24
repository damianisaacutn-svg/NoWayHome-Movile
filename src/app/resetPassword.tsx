import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
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
import { authService } from "../services/authService";
import {
  checkResetTokenStatus,
  resetPassword,
} from "../services/passwordResetService";

/*
|--------------------------------------------------------------------------
| Restablecimiento de contraseña desde token (React Native / Expo)
|--------------------------------------------------------------------------
| - Si se abre desde el enlace del correo (`?token=...`), verifica de
|   inmediato si el token ya fue utilizado o expiró (incluso al refrescar
|   la página) y bloquea todos los campos si el cambio ya fue realizado.
| - Cuando proviene del enlace del correo, oculta cualquier navegación hacia
|   el login web para evitar confusiones con la aplicación móvil.
*/
function extractResetToken(input: string): string {
  const trimmed = String(input || "").trim();
  if (!trimmed) return "";

  const match = trimmed.match(/[?&]token=([^&#\s]+)/i);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]).trim();
    } catch {
      return match[1].trim();
    }
  }

  return trimmed;
}

function getUsedTokenStorageKey(token: string): string {
  return `used_reset_token_${token.slice(0, 24)}`;
}

export function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    token?: string | string[];
    from?: string | string[];
  }>();

  const urlToken = useMemo(() => {
    const raw = Array.isArray(params.token) ? params.token[0] : params.token;
    return extractResetToken(raw || "");
  }, [params.token]);

  const isOpenedFromEmailLink = Boolean(urlToken);

  const [manualTokenInput, setManualTokenInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [alreadyUsedOnRefresh, setAlreadyUsedOnRefresh] = useState(false);
  const [isTokenInvalid, setIsTokenInvalid] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(Boolean(urlToken));
  const [isLoading, setIsLoading] = useState(false);

  const effectiveToken = useMemo(
    () => urlToken || extractResetToken(manualTokenInput),
    [urlToken, manualTokenInput],
  );

  // Verificar al cargar / refrescar si el enlace ya fue utilizado o expiró
  useEffect(() => {
    let isMounted = true;

    const verifyTokenOnLoad = async () => {
      if (!urlToken) {
        setIsCheckingToken(false);
        return;
      }

      // 1. Revisión inmediata en almacenamiento local (en caso de refrescar tras actualizar)
      const localUsed = authService.getStorageItem(
        getUsedTokenStorageKey(urlToken),
      );
      if (localUsed === "true") {
        if (isMounted) {
          setAlreadyUsedOnRefresh(true);
          setSuccess(
            "El cambio de contraseña ya fue realizado correctamente con este enlace. Los campos permanecen bloqueados por seguridad.",
          );
          setIsCheckingToken(false);
        }
        return;
      }

      // 2. Revisión contra el servidor (cubre refrescos o reapertura del enlace en otra pestaña)
      try {
        const statusResult = await checkResetTokenStatus(urlToken);
        if (!isMounted) return;

        if (!statusResult?.valid) {
          if (statusResult?.status === "used") {
            authService.setStorageItem(
              getUsedTokenStorageKey(urlToken),
              "true",
            );
            setAlreadyUsedOnRefresh(true);
            setSuccess(
              "El cambio de contraseña ya fue realizado correctamente con este enlace. Los campos permanecen bloqueados por seguridad.",
            );
          } else {
            setIsTokenInvalid(true);
            setError(
              statusResult?.message || "El enlace no es válido o ha expirado.",
            );
          }
        }
      } catch {
        // Si el endpoint de estado aún no responde, el POST final validará el token
      } finally {
        if (isMounted) {
          setIsCheckingToken(false);
        }
      }
    };

    void verifyTokenOnLoad();
    return () => {
      isMounted = false;
    };
  }, [urlToken]);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (alreadyUsedOnRefresh || isTokenInvalid) {
      return;
    }

    if (!effectiveToken) {
      setError(
        "Pega el enlace o código de recuperación que recibiste en tu correo.",
      );
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Completa ambos campos de contraseña.");
      return;
    }

    if (newPassword.length < 8) {
      setError("La contraseña debe tener mínimo 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("La contraseña y la confirmación deben coincidir.");
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(effectiveToken, newPassword);
      authService.setStorageItem(
        getUsedTokenStorageKey(effectiveToken),
        "true",
      );
      setSuccess(
        "¡Tu contraseña se actualizó correctamente! Ya puedes volver a la aplicación móvil de NoWayHome e iniciar sesión con tu nueva contraseña.",
      );
      setNewPassword("");
      setConfirmPassword("");
      setManualTokenInput("");
    } catch (resetError: unknown) {
      setIsTokenInvalid(true);
      if (resetError instanceof Error && resetError.message) {
        setError(resetError.message);
      } else {
        setError("El enlace no es válido o ha expirado.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fieldsLocked =
    isLoading ||
    Boolean(success) ||
    alreadyUsedOnRefresh ||
    isTokenInvalid;

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      {/* Ocultamos el Header cuando se abre desde el enlace del correo para evitar navegación hacia la web */}
      {!isOpenedFromEmailLink ? <Header /> : null}

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-[#FAFAFA]"
      >
        <View className="flex-1 justify-center items-center px-5 py-10">
          <View className="w-full max-w-md p-6 bg-white border border-[#DCDCDC] shadow-sm rounded-2xl">
            <View className="items-center mb-8">
              <Text className="font-poppins font-semibold text-3xl text-[#1C1C1C] mb-2 text-center">
                Nueva contraseña
              </Text>
              <Text className="font-inter text-[#595959] text-sm leading-5 text-center">
                {fieldsLocked && (Boolean(success) || alreadyUsedOnRefresh)
                  ? "Proceso completado de forma segura."
                  : "Crea una contraseña nueva (mínimo 8 caracteres) para recuperar el acceso a tu cuenta."}
              </Text>
            </View>

            {error || success ? (
              <View
                className={`flex-row items-start p-4 mb-6 rounded-xl border ${
                  success
                    ? "border-[#B8860B]/35 bg-[#F5F2EC]"
                    : "border-red-200 bg-red-50"
                }`}
              >
                {success ? (
                  <CheckCircle2 size={20} color="#B8860B" />
                ) : (
                  <AlertCircle size={20} color="#DC2626" />
                )}
                <View className="ml-3 flex-1">
                  <Text
                    className={`font-poppins font-semibold text-sm mb-1 ${
                      success ? "text-[#1C1C1C]" : "text-red-800"
                    }`}
                  >
                    {success
                      ? alreadyUsedOnRefresh
                        ? "Contraseña ya actualizada"
                        : "¡Cambio realizado con éxito!"
                      : "Enlace no disponible"}
                  </Text>
                  <Text
                    className={`font-inter text-sm leading-5 ${
                      success ? "text-[#595959]" : "text-red-700"
                    }`}
                  >
                    {success || error}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Si se abrió manualmente desde la app móvil sin token en URL */}
            {!urlToken ? (
              <View className="mb-4">
                <Text className="font-inter-medium text-[#1C1C1C] mb-1.5">
                  Enlace o código del correo
                </Text>
                <View className="relative justify-center">
                  <View className="absolute left-4 z-10">
                    <KeyRound size={20} color="#B87333" />
                  </View>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Pega el enlace o token recibido"
                    placeholderTextColor="#7A7A7A"
                    value={manualTokenInput}
                    onChangeText={setManualTokenInput}
                    editable={!fieldsLocked}
                    className={`pl-12 pr-4 h-12 border rounded-xl font-inter-medium text-[#1C1C1C] ${
                      fieldsLocked
                        ? "bg-[#DCDCDC]/35 border-[#DCDCDC] opacity-60"
                        : "bg-[#FAFAFA] border-[#DCDCDC] focus:border-[#B8860B]"
                    }`}
                  />
                </View>
              </View>
            ) : null}

            <View className="mb-4">
              <Text className="font-inter-medium text-[#1C1C1C] mb-1.5">
                Nueva contraseña
              </Text>
              <View className="relative justify-center">
                <View className="absolute left-4 z-10">
                  <Lock size={20} color={fieldsLocked ? "#7A7A7A" : "#B87333"} />
                </View>
                <TextInput
                  secureTextEntry={!showNewPassword}
                  placeholder={
                    fieldsLocked
                      ? "Campo bloqueado por seguridad"
                      : "Mínimo 8 caracteres"
                  }
                  placeholderTextColor="#7A7A7A"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!fieldsLocked}
                  className={`pl-12 pr-12 h-12 border rounded-xl font-inter-medium text-[#1C1C1C] ${
                    fieldsLocked
                      ? "bg-[#DCDCDC]/35 border-[#DCDCDC] opacity-60"
                      : "bg-[#FAFAFA] border-[#DCDCDC] focus:border-[#B8860B]"
                  }`}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword((value) => !value)}
                  disabled={fieldsLocked}
                  className={`absolute right-4 z-10 p-1 ${
                    fieldsLocked ? "opacity-40" : ""
                  }`}
                >
                  {showNewPassword ? (
                    <EyeOff size={20} color="#595959" />
                  ) : (
                    <Eye size={20} color="#595959" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-6">
              <Text className="font-inter-medium text-[#1C1C1C] mb-1.5">
                Confirmar contraseña
              </Text>
              <View className="relative justify-center">
                <View className="absolute left-4 z-10">
                  <Lock size={20} color={fieldsLocked ? "#7A7A7A" : "#B87333"} />
                </View>
                <TextInput
                  secureTextEntry={!showConfirmPassword}
                  placeholder={
                    fieldsLocked
                      ? "Campo bloqueado por seguridad"
                      : "Confirma tu nueva contraseña"
                  }
                  placeholderTextColor="#7A7A7A"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!fieldsLocked}
                  className={`pl-12 pr-12 h-12 border rounded-xl font-inter-medium text-[#1C1C1C] ${
                    fieldsLocked
                      ? "bg-[#DCDCDC]/35 border-[#DCDCDC] opacity-60"
                      : "bg-[#FAFAFA] border-[#DCDCDC] focus:border-[#B8860B]"
                  }`}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((value) => !value)}
                  disabled={fieldsLocked}
                  className={`absolute right-4 z-10 p-1 ${
                    fieldsLocked ? "opacity-40" : ""
                  }`}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#595959" />
                  ) : (
                    <Eye size={20} color="#595959" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={fieldsLocked}
              className={`flex-row w-full bg-[#B8860B] active:bg-[#9A6F09] min-h-[48px] rounded-xl justify-center items-center mb-3 ${
                fieldsLocked ? "opacity-45" : ""
              }`}
            >
              {isLoading || isCheckingToken ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text className="font-inter-medium text-white text-base mr-2">
                    {Boolean(success) || alreadyUsedOnRefresh
                      ? "Contraseña actualizada"
                      : "Actualizar contraseña"}
                  </Text>
                  <ArrowRight size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Si viene del enlace del correo, NO mostrar botón de volver al login web */}
            {isOpenedFromEmailLink ? (
              <View className="flex-row items-center justify-center mt-2 p-3 rounded-xl bg-[#F5F2EC] border border-[#DCDCDC]">
                <ShieldCheck size={18} color="#B8860B" />
                <Text className="font-inter text-xs text-[#1C1C1C] ml-2 flex-1">
                  Por seguridad, cierra esta ventana cuando termines y regresa a
                  la aplicación móvil NoWayHome.
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => router.replace("/loginPage" as any)}
                className="flex-row w-full min-h-[48px] rounded-xl justify-center items-center border-[1.5px] border-[#B8860B] bg-transparent"
              >
                <ArrowLeft size={16} color="#B8860B" />
                <Text className="font-inter-medium text-[#B8860B] ml-2">
                  Volver al login móvil
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default ResetPassword;
