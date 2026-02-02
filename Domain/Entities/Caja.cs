using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    public class Caja
    {
        [Key]
        public int Id { get; set; }
        public DateTime FechaApertura { get; set; }
        public DateTime? FechaCierre { get; set; }

        public string Usuario { get; set; } = "Admin";

        // Fondos
        [Column(TypeName = "decimal(18,2)")]
        public decimal MontoInicial { get; set; } // Cambio inicial

        // --- TOTALES TEÓRICOS (Calculados por el sistema) ---
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalEfectivo { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalTransferencia { get; set; }

        // 🟢 1. Lo que contaste de billetes (Efectivo Real)
        [Column(TypeName = "decimal(18,2)")]
        public decimal MontoFinal { get; set; }

        // 🟢 2. Lo que viste en el Banco/MP (Transferencia Real)
        [Column(TypeName = "decimal(18,2)")]
        public decimal MontoRealTransferencia { get; set; }
    }
}