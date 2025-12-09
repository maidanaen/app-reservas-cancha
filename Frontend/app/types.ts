// Este "molde" debe ser igual a tu clase de C#
export interface Cancha {
  id: number;
  nombre: string;
  deporte: string;
  precioPorHora: number;
  techada: boolean; // Ojo: en tu JSON vi "techada", asegúrate que coincida
  imgUrl: string;
}
export interface Reserva {
  id: number;
  fechaInicio: string; // Vienen como texto desde el JSON
  fechaFin: string;
  clienteNombre: string;
  clienteTelefono: string;
  canchaId: number;
}