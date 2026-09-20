import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Vinetrap — Local DELTARUNE",
  description:
    "A private local replica of Project Vinetrap backed by an installed copy of DELTARUNE.",
  icons: {
    icon: "/play/fav.ico",
    shortcut: "/play/fav.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
