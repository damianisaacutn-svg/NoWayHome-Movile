import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
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
import { ResetPassword } from "./resetPassword";

export function UpdatePassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const hasResetToken = Boolean(
    Array.isArray(params.token) ? params.token[0] : params.token,
  );

  const [session, setSession] = useState(() => authService.getSession());
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextSession) => {
      setSession(nextSession);
    });
    return unsubscribe;
  }, []);

  // Si llega con un token de recuperación o sin sesión activa, reutiliza ResetPassword
  if (hasResetToken || !session?.isAuthenticated) {
    return <ResetPassword />;
  }

  const handleUpdatePassword = async () => {
    setError("");
    setSuccess("");

    const currentUser = (session?.user || {}) as Record<string, any>;
    const userId =
      currentUser.id_inquilino ??
      currentUser.id_arrendatario ??
      currentUser.id;
    const role = String(
      session?.role || currentUser.role || currentUser.rol || "inquilino",
    );

    setIsLoading(true);
    try {
      const result = await authController.updatePassword({
        userId,
        role,
        password,
        confirmPassword,
      });

      if (result.success) {
        setSuccess(result.message || "Contraseña actualizada con éxito.");
        setPassword("");
        setConfirmPassword("");
      } else {
        setError(result.message || "No se pudo actualizar la contraseña.");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al actualizar la contraseña.",
      );
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
        <View className="flex-1 justify-center items-center px-5 py-10">
          <View className="w-full max-w-md p-6 bg-white border border-[#6B8E23]/15 shadow-sm rounded-3xl">
            <View className="items-center mb-8">
              <Text className="font-bold text-3xl text-[#5F5F5F] mb-2 text-center">
                Cambiar contraseña
              </Text>
              <Text className="text-[#5F5F5F]/75 text-sm leading-5 text-center">
                Ingresa y confirma la nueva contraseña para tu cuenta.
              </Text>
            </View>

            {error || success ? (
              <View
                className={`flex-row items-center p-4 mb-6 rounded-xl border ${
                  success
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                {success ? (
                  <CheckCircle2 size={18} color="#16A34A" />
                ) : (
                  <AlertCircle size={18} color="#DC2626" />
                )}
                <Text
                  className={`ml-3 flex-1 text-sm ${
                    success ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {success || error}
                </Text>
              </View>
            ) : null}

            <View className="mb-4">
              <Text className="text-[#5F5F5F] font-medium mb-1.5">
                Nueva contraseña
              </Text>
              <View className="relative justify-center">
                <View className="absolute left-4 z-10">
                  <Lock size={20} color="#A67C52" />
                </View>
                <TextInput
                  secureTextEntry={!showPassword}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#5F5F5F55"
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                  className="pl-12 pr-12 h-12 bg-[#FAFAFA] border border-[#6B8E23]/20 focus:border-[#6B8E23] text-[#5F5F5F] rounded-xl"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  disabled={isLoading}
                  className="absolute right-4 z-10 p-1"
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#5F5F5F88" />
                  ) : (
                    <Eye size={20} color="#5F5F5F88" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-[#5F5F5F] font-medium mb-1.5">
                Confirmar nueva contraseña
              </Text>
              <View className="relative justify-center">
                <View className="absolute left-4 z-10">
                  <Lock size={20} color="#A67C52" />
                </View>
                <TextInput
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Repite la contraseña"
                  placeholderTextColor="#5F5F5F55"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!isLoading}
                  className="pl-12 pr-12 h-12 bg-[#FAFAFA] border border-[#6B8E23]/20 focus:border-[#6B8E23] text-[#5F5F5F] rounded-xl"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  disabled={isLoading}
                  className="absolute right-4 z-10 p-1"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#5F5F5F88" />
                  ) : (
                    <Eye size={20} color="#5F5F5F88" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleUpdatePassword}
              disabled={isLoading}
              className={`flex-row w-full bg-[#6B8E23] h-12 rounded-xl justify-center items-center mb-3 ${
                isLoading ? "opacity-50" : ""
              }`}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text className="text-white font-medium text-base mr-2">
                    Actualizar contraseña
                  </Text>
                  <ArrowRight size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/" as any)}
              className="flex-row w-full h-11 rounded-xl justify-center items-center bg-transparent"
            >
              <ArrowLeft size={16} color="#6B8E23" />
              <Text className="text-[#6B8E23] font-medium ml-2">
                Volver al inicio
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default UpdatePassword;
