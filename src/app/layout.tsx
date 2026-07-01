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
    process.env.NEXT_PUBLIC_APP_URL || "https://clazicostore.com"
  ),
  manifest: "/manifest.json",
  applicationName: "Clazico Store",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Clazico Store",
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
        url: "/logos/logo.png?v=20260618",
        width: 2848,
        height: 1504,
        alt: "Clazico Store",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Clazico Store — Exclusive Shop",
    description: "Tienda exclusiva de zapatos y ropa.",
    images: ["/logos/logo.png?v=20260618"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-167x167.png", sizes: "167x167", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-167x167.png", sizes: "167x167", type: "image/png" },
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
        {/* PWA — explicit links for browsers that ignore metadata.icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-96x96.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" sizes="180x180" />
        <link
          rel="apple-touch-icon"
          href="/icons/icon-152x152.png"
          sizes="152x152"
        />
        <link
          rel="apple-touch-icon"
          href="/icons/icon-167x167.png"
          sizes="167x167"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-capable"
          content="yes"
        />
        <meta name="apple-mobile-web-app-title" content="Clazico Store" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="application-name" content="Clazico Store" />
        <meta name="theme-color" content="#E31E24" />
        <meta name="msapplication-TileColor" content="#E31E24" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
      </head>
      <body className="min-h-dvh flex flex-col font-[family-name:var(--font-inter)] antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
