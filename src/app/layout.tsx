import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Sidebar } from "@/components/shell/Sidebar";
import { Providers } from "./providers";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: { default: "Bitcoin em perspectiva", template: "%s · Bitcoin em perspectiva" },
  description: "Acompanhe seu Bitcoin em reais e dólares, com indicadores explicados e simulações baseadas no histórico.",
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#141312" },
  ],
};

// Aplica o tema salvo antes da primeira pintura, sem "flash" do tema errado.
const themeScript = `(function(){try{var t=localStorage.getItem("tema");if(t==="claro"||t==="escuro")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={manrope.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <Providers>
          <div className="md:grid md:grid-cols-[13.5rem_1fr]">
            <Sidebar />
            <main className="min-w-0 px-4 pt-6 pb-28 md:px-10 md:pt-10 md:pb-16">
              <div className="mx-auto max-w-[72rem]">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
