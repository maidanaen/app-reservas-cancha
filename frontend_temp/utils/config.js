// src/utils/config.js

// Esta lógica dice: "Si existe una variable de entorno (en Vercel), úsala.
// Si no, usa localhost (para cuando trabajas en tu PC)".
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://localhost:7123";