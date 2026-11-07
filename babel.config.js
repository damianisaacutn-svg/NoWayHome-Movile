// babel.config.js
// Archivo de configuración para Babel en proyectos React Native / Expo.
// Le indica al empaquetador (Metro) que utilice los preajustes estándar de Expo
// y carga el plugin 'nativewind/babel' para poder escribir y compilar clases
// de Tailwind CSS nativamente dentro de los componentes <View> y <Text>.

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
