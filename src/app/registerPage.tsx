import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User,
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
import { authController } from "../controllers/authController";
import { authService } from "../services/authService";

/*
|--------------------------------------------------------------------------
| Pantalla de Registro de Usuarios (Versión Móvil - React Native)
|--------------------------------------------------------------------------
| - Permite registrarse únicamente como "inquilino" (Huésped) o "arrendatario" (Anfitrión).
| - NO se permite registro de administradores en la versión móvil.
| - Al completar el registro, guarda los datos del usuario y el rol elegido
|   para que al iniciar sesión en `/loginPage` se reconozca su perfil.
*/
export default function RegisterPage() {
  const router = useRouter();
  const LAST_REGISTERED_KEY = "last_registered_user";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"inquilino" | "arrendatario">("inquilino");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    setError("");
    setSuccessMessage("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanName || !cleanEmail || !cleanPhone || !password || !confirmPassword) {
      setError("Por favor completa todos los campos.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Por favor ingresa un correo electrónico válido.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    // Garantizar que el rol solo sea inquilino o arrendatario (nunca administrador)
    const allowedRole: "inquilino" | "arrendatario" =
      role === "arrendatario" ? "arrendatario" : "inquilino";

    setIsLoading(true);

    try {
      const result = await authController.register({
        nombre: cleanName,
        name: cleanName,
        correo: cleanEmail,
        email: cleanEmail,
        telefono: cleanPhone,
        phone: cleanPhone,
        contrasena: password,
        password,
        confirmPassword,
        role: allowedRole,
        rol: allowedRole,
      });

      if (!result.success) {
        setError(
          result.message ||
            "No se pudo completar el registro. Verifica tus datos.",
        );
        return;
      }

      const returnedUser = result.user || result.usuario || {};
      const registeredUserData = {
        ...returnedUser,
        id:
          returnedUser.id ??
          returnedUser.id_inquilino ??
          returnedUser.id_arrendatario,
        id_inquilino:
          allowedRole === "inquilino"
            ? (returnedUser.id_inquilino ?? returnedUser.id)
            : undefined,
        id_arrendatario:
          allowedRole === "arrendatario"
            ? (returnedUser.id_arrendatario ?? returnedUser.id)
            : undefined,
        name: cleanName,
        nombre: returnedUser.nombre || cleanName,
        email: cleanEmail,
        correo: returnedUser.correo || cleanEmail,
        phone: cleanPhone,
        telefono: returnedUser.telefono || cleanPhone,
        role: allowedRole,
      };

      // Limpiamos cualquier 2FA pendiente anterior y guardamos la referencia
      // del usuario recién registrado para que LoginPage reconozca su rol y correo.
      authService.removeStorageItem("pending_2fa");
      authService.setStorageItem(
        LAST_REGISTERED_KEY,
        JSON.stringify(registeredUserData),
      );

      setSuccessMessage(
        "¡Cuenta creada exitosamente! Redirigiendo a iniciar sesión...",
      );

      setTimeout(() => {
        router.replace("/loginPage" as any);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Error inesperado al registrar la cuenta.");
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
        <View className="flex-1 items-center justify-center px-5 py-8">
          <View className="w-full max-w-md p-6 bg-white border border-[#6B8E23]/15 shadow-sm rounded-3xl">
            {/* Encabezado del Formulario */}
            <View className="items-center mb-6">
              <Text className="font-bold text-3xl text-[#5F5F5F] mb-2 text-center">
                Crea tu cuenta
              </Text>
              <Text className="text-[#5F5F5F]/70 text-sm text-center">
                Únete a No Way Home como huésped o anfitrión
              </Text>
            </View>

            {/* Selector de Rol (Inquilino / Arrendatario) */}
            <View className="mb-5">
              <Text className="text-[#5F5F5F] font-medium mb-2 text-sm">
                ¿Cómo deseas usar la plataforma?
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setRole("inquilino")}
                  className={`flex-1 flex-row items-center justify-center py-3 px-3 rounded-xl border ${
                    role === "inquilino"
                      ? "bg-[#6B8E23] border-[#6B8E23]"
                      : "bg-[#FAFAFA] border-[#6B8E23]/20"
                  }`}
                >
                  <User
                    color={role === "inquilino" ? "#FFFFFF" : "#5F5F5F"}
                    size={18}
                  />
                  <Text
                    className={`font-semibold text-sm ml-2 ${
                      role === "inquilino" ? "text-white" : "text-[#5F5F5F]"
                    }`}
                  >
                    Huésped (Inquilino)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setRole("arrendatario")}
                  className={`flex-1 flex-row items-center justify-center py-3 px-3 rounded-xl border ${
                    role === "arrendatario"
                      ? "bg-[#6B8E23] border-[#6B8E23]"
                      : "bg-[#FAFAFA] border-[#6B8E23]/20"
                  }`}
                >
                  <Building2
                    color={role === "arrendatario" ? "#FFFFFF" : "#5F5F5F"}
                    size={18}
                  />
                  <Text
                    className={`font-semibold text-sm ml-2 ${
                      role === "arrendatario" ? "text-white" : "text-[#5F5F5F]"
                    }`}
                  >
                    Anfitrión
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Campo Nombre Completo */}
            <View className="mb-4">
              <Text className="text-[#5F5F5F] font-medium mb-1.5 text-sm">
                Nombre completo
              </Text>
              <View className="flex-row items-center border border-[#6B8E23]/20 bg-[#FAFAFA] rounded-xl px-4 h-12">
                <User color="#A67C52" size={20} />
                <TextInput
                  placeholder="Tu nombre y apellidos"
                  placeholderTextColor="#5F5F5F66"
                  value={name}
                  onChangeText={setName}
                  className="flex-1 ml-3 text-[#5F5F5F]"
                />
              </View>
            </View>

            {/* Campo Correo Electrónico */}
            <View className="mb-4">
              <Text className="text-[#5F5F5F] font-medium mb-1.5 text-sm">
                Correo electrónico
              </Text>
              <View className="flex-row items-center border border-[#6B8E23]/20 bg-[#FAFAFA] rounded-xl px-4 h-12">
                <Mail color="#A67C52" size={20} />
                <TextInput
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor="#5F5F5F66"
                  value={email}
                  onChangeText={setEmail}
                  className="flex-1 ml-3 text-[#5F5F5F]"
                />
              </View>
            </View>

            {/* Campo Teléfono */}
            <View className="mb-4">
              <Text className="text-[#5F5F5F] font-medium mb-1.5 text-sm">
                Teléfono
              </Text>
              <View className="flex-row items-center border border-[#6B8E23]/20 bg-[#FAFAFA] rounded-xl px-4 h-12">
                <Phone color="#A67C52" size={20} />
                <TextInput
                  keyboardType="phone-pad"
                  placeholder="Ej. 5512345678"
                  placeholderTextColor="#5F5F5F66"
                  value={phone}
                  onChangeText={setPhone}
                  className="flex-1 ml-3 text-[#5F5F5F]"
                />
              </View>
            </View>

            {/* Campo Contraseña */}
            <View className="mb-4">
              <Text className="text-[#5F5F5F] font-medium mb-1.5 text-sm">
                Contraseña
              </Text>
              <View className="flex-row items-center border border-[#6B8E23]/20 bg-[#FAFAFA] rounded-xl px-4 h-12">
                <Lock color="#A67C52" size={20} />
                <TextInput
                  secureTextEntry={!showPassword}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#5F5F5F66"
                  value={password}
                  onChangeText={setPassword}
                  className="flex-1 ml-3 text-[#5F5F5F]"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="p-1"
                >
                  {showPassword ? (
                    <EyeOff color="#5F5F5F88" size={20} />
                  ) : (
                    <Eye color="#5F5F5F88" size={20} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Campo Confirmar Contraseña */}
            <View className="mb-6">
              <Text className="text-[#5F5F5F] font-medium mb-1.5 text-sm">
                Confirmar contraseña
              </Text>
              <View className="flex-row items-center border border-[#6B8E23]/20 bg-[#FAFAFA] rounded-xl px-4 h-12">
                <Lock color="#A67C52" size={20} />
                <TextInput
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor="#5F5F5F66"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  className="flex-1 ml-3 text-[#5F5F5F]"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="p-1"
                >
                  {showConfirmPassword ? (
                    <EyeOff color="#5F5F5F88" size={20} />
                  ) : (
                    <Eye color="#5F5F5F88" size={20} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Botón Crear Cuenta */}
            <TouchableOpacity
              disabled={isLoading}
              onPress={handleRegister}
              className={`w-full bg-[#6B8E23] h-12 rounded-xl flex-row items-center justify-center ${
                isLoading ? "opacity-50" : ""
              }`}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text className="text-white font-bold text-base mr-2">
                    Crear cuenta
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

            {/* Alerta de Éxito */}
            {successMessage ? (
              <View className="flex-row items-center p-3 bg-green-50 border border-green-200 rounded-xl mt-4">
                <CheckCircle2 color="#16A34A" size={18} />
                <Text className="text-green-800 text-sm ml-2 flex-1">
                  {successMessage}
                </Text>
              </View>
            ) : null}

            {/* Enlace hacia LoginPage (/loginPage) */}
            <View className="mt-7 items-center">
              <View className="flex-row items-center">
                <Text className="text-[#5F5F5F]">¿Ya tienes una cuenta? </Text>
                <TouchableOpacity
                  onPress={() => router.push("/loginPage" as any)}
                >
                  <Text className="text-[#6B8E23] font-bold">
                    Inicia sesión aquí
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
