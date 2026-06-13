import type { Metadata, Viewport } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
  ],
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Clazico Store — Exclusive Shop",
    template: "%s | Clazico Store",
  },
  description:
    "Tienda exclusiva de zapatos y ropa. Descubre las últimas tendencias en moda con estilo premium. Envíos a toda Venezuela.",
  keywords: [
    "zapatos",
    "ropa",
    "moda",
    "tienda online",
    "Venezuela",
    "Clazico",
    "exclusive shop",
    "calzado",
    "fashion",
  ],
  authors: [{ name: "Clazico Store" }],
  creator: "Clazico Store",
  publisher: "Clazico Store",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:40932"
  ),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Clazico",
  },
  formatDetection: {
    telephone: true,
    email: true,
  },
  openGraph: {
    type: "website",
    locale: "es_VE",
    siteName: "Clazico Store",
    title: "Clazico Store — Exclusive Shop",
    description:
      "Tienda exclusiva de zapatos y ropa. Estilo premium, envíos a toda Venezuela.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Clazico Store",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Clazico Store — Exclusive Shop",
    description: "Tienda exclusiva de zapatos y ropa.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/clazico.ico", sizes: "any" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
    ],
  },
};

import { Providers } from "@/components/providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body className="min-h-dvh flex flex-col font-[family-name:var(--font-inter)] antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
