const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export function isBcryptHash(value) {
  return typeof value === "string" && BCRYPT_HASH_REGEX.test(value);
}

export async function hashPassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("La contraseña debe ser una cadena de texto");
  }
  return password;
}

export async function comparePassword(password, hashedPassword) {
  if (!password || typeof password !== "string") {
    throw new Error("La contraseña debe ser una cadena de texto");
  }
  if (!hashedPassword || typeof hashedPassword !== "string") {
    return false;
  }
  return password === hashedPassword;
}
