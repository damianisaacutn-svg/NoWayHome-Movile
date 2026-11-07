import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Mail,
  Send,
} from "lucide-react-native";
import { useState } from "react";
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
import { requestPasswordReset } from "../services/passwordResetService";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const genericMessage =
  "Si el correo está registrado, recibirás un enlace en tu correo para restablecer tu contraseña.";

export function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Ingresa tu correo electrónico.");
      return;
    }

    if (!emailRegex.test(normalizedEmail)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }

    setIsLoading(true);

    try {
      await requestPasswordReset(normalizedEmail);
      setSuccess(genericMessage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (
        /network request failed|failed to fetch|ruta no encontrada/i.test(msg)
      ) {
        setError(
          "No se pudo conectar con el servidor. Verifica tu conexión y que el servidor esté encendido.",
        );
      } else {
        setSuccess(genericMessage);
      }
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
                Recuperar contraseña
              </Text>
              <Text className="text-[#5F5F5F]/75 text-sm leading-5 text-center">
                Escribe el correo asociado a tu cuenta y te enviaremos un enlace
                para crear una nueva contraseña.
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
                <View className="ml-3 flex-1">
                  <Text
                    className={`font-semibold text-sm ${
                      success ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    {success ? "Instrucciones enviadas" : "Error de recuperación"}
                  </Text>
                  <Text
                    className={`mt-1 text-sm ${
                      success ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {success || error}
                  </Text>
                </View>
              </View>
            ) : null}

            <View className="mb-6">
              <Text className="text-[#5F5F5F] font-medium mb-1.5">
                Correo electrónico
              </Text>
              <View className="relative justify-center">
                <View className="absolute left-4 z-10">
                  <Mail size={20} color="#A67C52" />
                </View>
                <TextInput
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor="#5F5F5F55"
                  value={email}
                  onChangeText={setEmail}
                  editable={!isLoading}
                  className="pl-12 pr-4 h-12 bg-[#FAFAFA] border border-[#6B8E23]/20 focus:border-[#6B8E23] text-[#5F5F5F] rounded-xl"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
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
                    Enviar instrucciones
                  </Text>
                  <Send size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/loginPage" as any)}
              className="flex-row w-full h-11 rounded-xl justify-center items-center bg-transparent"
            >
              <ArrowLeft size={16} color="#6B8E23" />
              <Text className="text-[#6B8E23] font-medium ml-2">
                Volver al login
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default ForgotPassword;
