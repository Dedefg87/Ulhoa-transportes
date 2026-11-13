import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ulhôa — Transporte Executivo",
  description: "Custo real, preço justo e lucro por serviço",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/logo.jpg",
    shortcut: "/icons/logo.jpg",
    apple: "/icons/logo.jpg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ulhôa",
  },
  openGraph: {
    title: "Ulhôa — Transporte Executivo",
    description: "Custo real, preço justo e lucro por serviço",
    images: ["/icons/logo.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Cabeçalho com a logo — aparece em todas as telas */}
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-md items-center gap-2 px-4 py-3">
            <Image
              src="/icons/logo.jpg"
              alt="Ulhôa Transporte Executivo"
              width={36}
              height={36}
              className="rounded-full object-cover"
              priority
            />
            <div className="flex flex-col leading-none">
              <span className="font-heading text-base font-semibold tracking-tight">
                Ulhôa
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Transporte Executivo
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-md flex-1 px-4 pb-24 pt-4">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}