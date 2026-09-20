import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/ui/PwaRegister";

export const metadata: Metadata = {
  title: "maré26",
  description: "Solve a nonogram and watch your pixel picture pop up into a tiny 3D toy-brick diorama.",
  manifest: "/manifest.webmanifest",
  applicationName: "maré26",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-180.png" },
  appleWebApp: { capable: true, title: "maré26", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf6ee" },
    { media: "(prefers-color-scheme: dark)", color: "#171936" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
