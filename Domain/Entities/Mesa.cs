using System.ComponentModel.DataAnnotations;

namespace Backend.Domain.Entities
{
    public class Mesa
    {
        [Key]
        public int Id { get; set; }

        public string Nombre { get; set; } = string.Empty; // Ej: "Mesa 1"

        // Estado visual: false = Libre, true = Ocupada (tiene una cuenta abierta)
        public bool EstaOcupada { get; set; } = false;

        // Para saber rápido cuál es la cuenta abierta de esta mesa (si la tiene)
        public int? ReservaActualId { get; set; }
    }
}