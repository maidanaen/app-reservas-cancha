using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Text.Json.Serialization;

namespace Domain.Entities
{
    public class MovimientoCaja
    {
        public int Id { get; set; }
        public int TurnoId { get; set; }
        public DateTime Fecha { get; set; }
        public string Tipo { get; set; } = string.Empty; // Ingreso/Egreso
        public string Concepto { get; set; } = string.Empty;
        public string MetodoPago { get; set; } = string.Empty;
        public decimal Monto { get; set; }

        [JsonIgnore]
        public CajaTurno? Turno { get; set; }
    }
}