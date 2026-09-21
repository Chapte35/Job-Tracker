import { Sidebar } from "@/components/layout/Sidebar";

export default function SettingsPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <h1 className="text-xl font-semibold text-ink">Paramètres</h1>
        <p className="text-sm text-ink-muted mt-0.5">À venir.</p>
      </main>
    </div>
  );
}
