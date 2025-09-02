import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./AuthContext"; // ✅ importer ton AuthContext

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Éditeur IA",
  description: "Projet IA avec authentification",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {/* ✅ Fournit le contexte auth à toute l’app */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
