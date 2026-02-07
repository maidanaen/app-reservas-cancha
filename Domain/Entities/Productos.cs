using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Domain.Entities
{
    public class Producto
    {
        [Key]
        public int Id { get; set; }

        public string Nombre { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Precio { get; set; }

        // Categorías: "Bebidas", "Comidas", "Accesorios", "General"
        public string Categoria { get; set; } = "General";
        public int UsuarioId { get; set; }
        public bool Activo { get; set; } = true; // Para borrar sin perder historial
    }
}