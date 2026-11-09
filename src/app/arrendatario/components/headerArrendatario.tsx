import { useRouter } from "expo-router";
import { Home, LogOut } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";
import { authService } from "@/services/authService";

export function HeaderArrendatario() {
  const router = useRouter();

  const handleGoToProfile = () => {
    router.replace("/arrendatario/profileArrendatario" as any);
  };

  const handleLogout = () => {
    authService.logout();
    router.replace("/loginPage" as any);
  };

  return (
    <View className="bg-white border-b border-[#6B8E23]/10 z-50">
      <View className="container mx-auto px-4">
        <View className="flex-row items-center justify-between h-16">
          {/* Logo / Nombre de la app */}
          <TouchableOpacity
            onPress={handleGoToProfile}
            activeOpacity={0.8}
            className="flex-row items-center gap-2"
          >
            <Home color="#6B8E23" size={24} />
            <Text className="font-semibold text-xl md:text-2xl text-[#6B8E23]">
              NoWayHome
            </Text>
          </TouchableOpacity>

          {/* Botón para Cerrar Sesión */}
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
            className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 border border-red-100"
          >
            <LogOut color="#DC2626" size={18} />
            <Text className="text-red-600 font-medium text-sm">
              Cerrar Sesión
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default HeaderArrendatario;
