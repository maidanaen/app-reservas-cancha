using Backend.Domain.Entities;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    public class Reserva
    {
        [Key]
        public int Id { get; set; }
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }

        public string ClienteNombre { get; set; } = string.Empty;
        public string ClienteTelefono { get; set; } = string.Empty;
        public string MetodoPago { get; set; } = "Sin especificar";

        public string Estado { get; set; } = "Pendiente";

       // Sirve para clasificar: "Cancha", "Mesa" o "Mostrador".
        public string Tipo { get; set; } = "Cancha";

        public int? CanchaId { get; set; }
        [ForeignKey("CanchaId")]
        public Cancha? Cancha { get; set; }

        public int? MesaId { get; set; }
        [ForeignKey("MesaId")]
        public Mesa? Mesa { get; set; }

        // Caja: Cuánto pagaron por cada medio
        [Column(TypeName = "decimal(18,2)")]
        public decimal CobradoEfectivo { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal CobradoTransferencia { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal CobradoDigital { get; set; }
        // Agrega esta propiedad para saber en qué caja impactó el dinero
        public int? CajaId { get; set; }
        
        // 🟢 Novedad: Descuento global en dinero aplicado a toda la reserva/cuenta
        [Column(TypeName = "decimal(18,2)")]
        public decimal DescuentoTotalMonto { get; set; } = 0;

        public List<Consumo> Consumos { get; set; } = new List<Consumo>();
        public int UsuarioId { get; set; }

        [ForeignKey("UsuarioId")]
        public Usuario? Usuario { get; set; }
        public string? GrupoId { get; set; } // Identificador para borrar en lote
        public DateTime? FechaCobro { get; set; }
    }
}