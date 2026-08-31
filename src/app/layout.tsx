import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegistraSW } from "@/components/RegistraSW";

export const metadata: Metadata = {
  title: "Spesa",
  description: "La spesa e la settimana della tua dieta: piano, lista e dispensa che si tengono aggiornati da soli.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#F1F0EE",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="h-full flex flex-col">
        <RegistraSW />
        {children}
      </body>
    </html>
  );
}
