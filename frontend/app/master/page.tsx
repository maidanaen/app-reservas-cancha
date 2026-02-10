import { redirect } from "next/navigation";

export default function MasterRootPage() {
  // Cuando alguien entre a "localhost:3000/master", lo mandamos directo al dashboard
  redirect("/master/metricas"); 
}