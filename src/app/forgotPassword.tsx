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
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Header } from "@/components/header";
import { Input } from "@/components/input";
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
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <Header />

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
                Recuperar contraseña
              </Text>
              <Text className="font-inter text-[#595959] text-sm leading-5 text-center">
                Escribe el correo asociado a tu cuenta y te enviaremos un enlace
                para crear una nueva contraseña.
              </Text>
            </View>

            {error || success ? (
              <View
                className={`flex-row items-center p-4 mb-6 rounded-xl border ${
                  success
                    ? "border-[#B8860B]/35 bg-[#F5F2EC]"
                    : "border-red-200 bg-red-50"
                }`}
              >
                {success ? (
                  <CheckCircle2 size={18} color="#B8860B" />
                ) : (
                  <AlertCircle size={18} color="#DC2626" />
                )}
                <View className="ml-3 flex-1">
                  <Text
                    className={`font-poppins font-semibold text-sm ${
                      success ? "text-[#1C1C1C]" : "text-red-800"
                    }`}
                  >
                    {success ? "Instrucciones enviadas" : "Error de recuperación"}
                  </Text>
                  <Text
                    className={`font-inter mt-1 text-sm ${
                      success ? "text-[#595959]" : "text-red-700"
                    }`}
                  >
                    {success || error}
                  </Text>
                </View>
              </View>
            ) : null}

            <Input
              label="Correo electrónico"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
              leftIcon={<Mail size={20} color="#B87333" />}
              containerClassName="mb-6"
            />

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading}
              className={`flex-row w-full bg-[#B8860B] active:bg-[#9A6F09] min-h-[48px] rounded-xl justify-center items-center mb-3 ${
                isLoading ? "opacity-50" : ""
              }`}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text className="font-inter-medium text-white text-base mr-2">
                    Enviar instrucciones
                  </Text>
                  <Send size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/loginPage" as any)}
              className="flex-row w-full min-h-[48px] rounded-xl justify-center items-center border-[1.5px] border-[#B8860B] bg-transparent"
            >
              <ArrowLeft size={16} color="#B8860B" />
              <Text className="font-inter-medium text-[#B8860B] ml-2">
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
