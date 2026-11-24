import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  ArrowLeft,
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
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomTabBar } from "@/components/BottomTabBar";
import { Header } from "@/components/header";
import { Input } from "@/components/input";
import { StepIndicator } from "@/components/StepIndicator";
import { authController } from "../controllers/authController";
import { authService } from "../services/authService";

/*
|--------------------------------------------------------------------------
| Pantalla de Registro de Usuarios por Etapas (Fase 5 - UI)
|--------------------------------------------------------------------------
| - Etapa 1: Rol (Huésped / Anfitrión), Nombre completo y Teléfono.
| - Etapa 2: Correo electrónico, Contraseña y Confirmación.
| - NO se permite registro de administradores en la versión móvil.
*/
export default function RegisterPage() {
  const router = useRouter();
  const LAST_REGISTERED_KEY = "last_registered_user";

  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"inquilino" | "arrendatario">("inquilino");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleNextStep = () => {
    setError("");
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const nextErrors: { name?: string; phone?: string } = {};

    if (!cleanName) {
      nextErrors.name = "Ingresa tu nombre completo.";
    }
    if (!cleanPhone) {
      nextErrors.phone = "Ingresa un número de teléfono.";
    } else if (cleanPhone.replace(/\D/g, "").length < 7) {
      nextErrors.phone = "Ingresa un teléfono válido de al menos 7 dígitos.";
    }

    setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
    if (Object.values(nextErrors).some(Boolean)) {
      setError("Completa tus datos personales antes de continuar.");
      return;
    }

    setStep(1);
  };

  const handleRegister = async () => {
    setError("");
    setSuccessMessage("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const nextErrors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!cleanEmail) {
      nextErrors.email = "Ingresa tu correo electrónico.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      nextErrors.email = "Por favor ingresa un correo electrónico válido.";
    }

    if (!password) {
      nextErrors.password = "Ingresa una contraseña.";
    } else if (password.length < 6) {
      nextErrors.password = "La contraseña debe tener al menos 6 caracteres.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirma tu contraseña.";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
    if (
      !cleanName ||
      !cleanPhone ||
      Object.values(nextErrors).some(Boolean)
    ) {
      setError("Revisa los campos marcados antes de crear tu cuenta.");
      return;
    }

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
    <SafeAreaView
      className="flex-1 bg-[#FAFAFA]"
      edges={["top", "left", "right"]}
    >
      <StatusBar style="dark" />
      <Header />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-[#FAFAFA]"
      >
        <View className="flex-1 items-center justify-center px-5 py-8">
          <View className="w-full max-w-md p-6 bg-white border border-[#DCDCDC] shadow-sm rounded-2xl">
            {/* Encabezado del Formulario */}
            <View className="items-center mb-6">
              <Text className="font-poppins font-semibold text-3xl text-[#1C1C1C] mb-2 text-center">
                Crea tu cuenta
              </Text>
              <Text className="font-inter text-[#595959] text-sm text-center">
                Únete a No Way Home como huésped o anfitrión
              </Text>
            </View>

            <StepIndicator
              steps={["Tu perfil", "Acceso y seguridad"]}
              currentStep={step}
              onStepPress={(idx) => {
                if (idx === 0) {
                  setError("");
                  setStep(0);
                }
              }}
            />

            {step === 0 ? (
              <View>
                {/* Selector de Rol (Inquilino / Arrendatario) */}
                <View className="mb-5">
                  <Text className="font-inter-medium text-[#1C1C1C] mb-2 text-sm">
                    ¿Cómo deseas usar la plataforma?
                  </Text>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setRole("inquilino")}
                      className={`min-h-[48px] flex-1 flex-row items-center justify-center py-3 px-3 rounded-xl border ${
                        role === "inquilino"
                          ? "bg-[#B8860B] border-[#B8860B]"
                          : "bg-[#FAFAFA] border-[#DCDCDC]"
                      }`}
                    >
                      <User
                        color={role === "inquilino" ? "#FFFFFF" : "#B87333"}
                        size={18}
                      />
                      <Text
                        className={`font-inter-medium text-sm ml-2 ${
                          role === "inquilino" ? "text-white" : "text-[#1C1C1C]"
                        }`}
                      >
                        Huésped
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setRole("arrendatario")}
                      className={`min-h-[48px] flex-1 flex-row items-center justify-center py-3 px-3 rounded-xl border ${
                        role === "arrendatario"
                          ? "bg-[#B8860B] border-[#B8860B]"
                          : "bg-[#FAFAFA] border-[#DCDCDC]"
                      }`}
                    >
                      <Building2
                        color={role === "arrendatario" ? "#FFFFFF" : "#B87333"}
                        size={18}
                      />
                      <Text
                        className={`font-inter-medium text-sm ml-2 ${
                          role === "arrendatario"
                            ? "text-white"
                            : "text-[#1C1C1C]"
                        }`}
                      >
                        Anfitrión
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Input
                  label="Nombre completo"
                  placeholder="Tu nombre y apellidos"
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (fieldErrors.name) {
                      setFieldErrors((p) => ({ ...p, name: undefined }));
                    }
                  }}
                  error={fieldErrors.name}
                  leftIcon={<User color="#B87333" size={20} />}
                  containerClassName="mb-4"
                />

                <Input
                  label="Teléfono"
                  type="tel"
                  placeholder="Ej. 5512345678"
                  value={phone}
                  onChangeText={(val) => {
                    setPhone(val);
                    if (fieldErrors.phone) {
                      setFieldErrors((p) => ({ ...p, phone: undefined }));
                    }
                  }}
                  error={fieldErrors.phone}
                  leftIcon={<Phone color="#B87333" size={20} />}
                  containerClassName="mb-6"
                />

                <TouchableOpacity
                  onPress={handleNextStep}
                  className="w-full bg-[#B8860B] active:bg-[#9A6F09] min-h-[48px] rounded-xl flex-row items-center justify-center"
                >
                  <Text className="font-inter-medium text-white text-base mr-2">
                    Continuar
                  </Text>
                  <ArrowRight color="#FFFFFF" size={20} />
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Input
                  label="Correo electrónico"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (fieldErrors.email) {
                      setFieldErrors((p) => ({ ...p, email: undefined }));
                    }
                  }}
                  error={fieldErrors.email}
                  leftIcon={<Mail color="#B87333" size={20} />}
                  containerClassName="mb-4"
                />

                <Input
                  label="Contraseña"
                  type={showPassword ? "text" : "password"}
                  secureTextEntry={!showPassword}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (fieldErrors.password) {
                      setFieldErrors((p) => ({ ...p, password: undefined }));
                    }
                  }}
                  error={fieldErrors.password}
                  leftIcon={<Lock color="#B87333" size={20} />}
                  rightElement={
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      className="p-1.5"
                    >
                      {showPassword ? (
                        <EyeOff color="#595959" size={20} />
                      ) : (
                        <Eye color="#595959" size={20} />
                      )}
                    </TouchableOpacity>
                  }
                  containerClassName="mb-4"
                />

                <Input
                  label="Confirmar contraseña"
                  type={showConfirmPassword ? "text" : "password"}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((p) => ({
                        ...p,
                        confirmPassword: undefined,
                      }));
                    }
                  }}
                  error={fieldErrors.confirmPassword}
                  leftIcon={<Lock color="#B87333" size={20} />}
                  rightElement={
                    <TouchableOpacity
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="p-1.5"
                    >
                      {showConfirmPassword ? (
                        <EyeOff color="#595959" size={20} />
                      ) : (
                        <Eye color="#595959" size={20} />
                      )}
                    </TouchableOpacity>
                  }
                  containerClassName="mb-6"
                />

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    disabled={isLoading}
                    onPress={() => {
                      setError("");
                      setStep(0);
                    }}
                    className="min-h-[48px] px-4 border-[1.5px] border-[#B8860B] rounded-xl flex-row items-center justify-center"
                  >
                    <ArrowLeft color="#B8860B" size={18} />
                    <Text className="font-inter-medium text-[#B8860B] text-sm ml-1.5">
                      Atrás
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={isLoading}
                    onPress={handleRegister}
                    className={`flex-1 bg-[#B8860B] active:bg-[#9A6F09] min-h-[48px] rounded-xl flex-row items-center justify-center ${
                      isLoading ? "opacity-50" : ""
                    }`}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Text className="font-inter-medium text-white text-base mr-2">
                          Crear cuenta
                        </Text>
                        <ArrowRight color="#FFFFFF" size={20} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Alerta de Error */}
            {error ? (
              <View className="flex-row items-center p-3.5 bg-red-50 border border-red-200 rounded-xl mt-4">
                <AlertCircle color="#DC2626" size={18} />
                <Text className="font-inter text-red-800 text-sm ml-2 flex-1">
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Alerta de Éxito */}
            {successMessage ? (
              <View className="flex-row items-center p-3.5 bg-[#F5F2EC] border border-[#B8860B]/40 rounded-xl mt-4">
                <CheckCircle2 color="#B8860B" size={18} />
                <Text className="font-inter text-[#1C1C1C] text-sm ml-2 flex-1">
                  {successMessage}
                </Text>
              </View>
            ) : null}

            {/* Enlace hacia LoginPage */}
            <View className="mt-7 items-center">
              <View className="flex-row items-center">
                <Text className="font-inter text-[#1C1C1C]">
                  ¿Ya tienes una cuenta?{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/loginPage" as any)}
                  className="min-h-[44px] justify-center px-1"
                >
                  <Text className="font-inter-semibold text-[#B8860B]">
                    Inicia sesión aquí
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <BottomTabBar />
    </SafeAreaView>
  );
}
