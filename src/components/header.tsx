import { usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
// Usamos lucide-react-native para móviles
import { Home, LogIn, LogOut, Menu, User, X } from "lucide-react-native";
import { authService } from "../services/authService";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [session, setSession] = useState(() => authService.getSession());

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextSession) => {
      setSession(nextSession);
    });
    return unsubscribe;
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavigation = (path: any) => {
    router.push(path);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    authService.logout();
    setIsMobileMenuOpen(false);
    router.replace("/loginPage" as any);
  };

  const isAuthenticated = Boolean(session?.isAuthenticated);
  const isLoginRoute =
    pathname === "/loginPage" || pathname === "/loginpage";

  return (
    <View className="bg-white border-b border-[#6B8E23]/10 z-50">
      <View className="container mx-auto px-4">
        <View className="flex-row items-center justify-between h-16">
          {/* Logo */}
          <TouchableOpacity
            onPress={() => handleNavigation("/")}
            activeOpacity={0.8}
            className="flex-row items-center gap-2"
          >
            <Home color="#6B8E23" size={24} />
            <Text className="font-semibold text-xl md:text-2xl text-[#6B8E23]">
              NoWayHome
            </Text>
          </TouchableOpacity>

          {/* Desktop Navigation (Oculto o adaptado para pantallas grandes / tablets) */}
          <View className="hidden md:flex flex-row items-center gap-6">
            {isAuthenticated ? (
              <>
                <TouchableOpacity
                  onPress={() => handleNavigation("/")}
                  className="flex-row items-center gap-2"
                >
                  <User color="#6B8E23" size={20} />
                  <Text className="text-[#6B8E23] font-medium">
                    {(session?.user as any)?.nombre ||
                      (session?.user as any)?.correo ||
                      "Mi Cuenta"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleLogout}
                  className="flex-row items-center gap-1.5 py-2"
                >
                  <LogOut color="#DC2626" size={18} />
                  <Text className="text-red-600 font-medium">Salir</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => handleNavigation("/loginPage")}
                  className="flex-row items-center gap-2 py-2"
                >
                  <LogIn
                    color={isLoginRoute ? "#6B8E23" : "#5F5F5F"}
                    size={20}
                  />
                  <Text
                    className={
                      isLoginRoute
                        ? "text-[#6B8E23] font-medium"
                        : "text-[#5F5F5F]"
                    }
                  >
                    Iniciar Sesión
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleNavigation("/registerpage")}
                  className="bg-[#6B8E23] px-4 py-2 rounded-xl items-center justify-center"
                >
                  <Text className="text-white font-medium">Registrarse</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Mobile Menu Button */}
          <TouchableOpacity
            onPress={toggleMobileMenu}
            className="md:hidden p-2"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X color="#5F5F5F" size={24} />
            ) : (
              <Menu color="#5F5F5F" size={24} />
            )}
          </TouchableOpacity>
        </View>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <View className="md:hidden py-4 border-t border-[#6B8E23]/10">
            <View className="flex-col gap-4">
              <TouchableOpacity
                onPress={() => handleNavigation("/")}
                className="flex-row items-center gap-2 py-2"
              >
                <Home
                  color={pathname === "/" ? "#6B8E23" : "#5F5F5F"}
                  size={20}
                />
                <Text
                  className={`text-base ${
                    pathname === "/"
                      ? "text-[#6B8E23] font-medium"
                      : "text-[#5F5F5F]"
                  }`}
                >
                  Inicio
                </Text>
              </TouchableOpacity>

              {isAuthenticated ? (
                <>
                  <TouchableOpacity
                    onPress={() => handleNavigation("/")}
                    className="flex-row items-center gap-2 py-2"
                  >
                    <User color="#6B8E23" size={20} />
                    <Text className="text-base text-[#6B8E23] font-medium">
                      {(session?.user as any)?.nombre ||
                        (session?.user as any)?.correo ||
                        "Mi Perfil"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleLogout}
                    className="flex-row items-center gap-2 py-2"
                  >
                    <LogOut color="#DC2626" size={20} />
                    <Text className="text-base text-red-600 font-medium">
                      Cerrar Sesión
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => handleNavigation("/loginPage")}
                    className="flex-row items-center gap-2 py-2"
                  >
                    <LogIn
                      color={isLoginRoute ? "#6B8E23" : "#5F5F5F"}
                      size={20}
                    />
                    <Text
                      className={`text-base ${
                        isLoginRoute
                          ? "text-[#6B8E23] font-medium"
                          : "text-[#5F5F5F]"
                      }`}
                    >
                      Iniciar Sesión
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleNavigation("/registerpage")}
                    className="bg-[#6B8E23] h-12 rounded-xl items-center justify-center mt-2 w-full"
                  >
                    <Text className="text-white font-medium text-base">
                      Registrarse
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
