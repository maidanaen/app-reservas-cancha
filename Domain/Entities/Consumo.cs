using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    public class Consumo
    {
        [Key]
        public int Id { get; set; }

        public int ReservaId { get; set; }
        [ForeignKey("ReservaId")]
        public virtual Reserva? Reserva { get; set; }

        public string Producto { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Precio { get; set; }

        public int Cantidad { get; set; } = 1;
        public string Jugador { get; set; } = string.Empty;

        public string? MetodoPago { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal DescuentoPorcentaje { get; set; } = 0; // ej: 10.00%
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal DescuentoMonto { get; set; } = 0; // Descuento en dinero calculado

        // 👇 ¡ESTA LÍNEA ES LA QUE FALTA! 👇
        public DateTime FechaHora { get; set; } = DateTime.UtcNow;
    }
}