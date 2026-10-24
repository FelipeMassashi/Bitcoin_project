import type { Metadata } from "next";
import { Settings } from "@/components/settings/Settings";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Configurações" };

export default function Configuracoes() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Configurações">Aparência, moeda e o controle do que este navegador guarda sobre você.</PageHeader>
      <Settings />
    </div>
  );
}
