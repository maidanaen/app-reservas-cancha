using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class CajaTurno
    {
        public int Id { get; set; }
        public DateTime FechaApertura { get; set; }
        public DateTime? FechaCierre { get; set; }
        public decimal MontoInicial { get; set; }
        public decimal? MontoFinal { get; set; }
        public string Usuario { get; set; } = string.Empty;
        public string Estado { get; set; } = "Abierta";

        // Relación con movimientos
        public List<MovimientoCaja> Movimientos { get; set; } = new List<MovimientoCaja>();
    }
}
