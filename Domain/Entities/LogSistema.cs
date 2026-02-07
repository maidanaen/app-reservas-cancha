using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class LogSistema
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public string Nivel { get; set; } = "INFO";
        public string Accion { get; set; }
        public string Usuario { get; set; }
        public string Detalle { get; set; }
    }
}