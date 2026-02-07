import SuperAdminNavbar from "@/components/SuperAdminNavbar";

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <SuperAdminNavbar /> {/* ✅ El menú oscuro vive aquí */}
      <main>{children}</main>
    </div>
  );
}