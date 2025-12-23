import type { Metadata } from "next";
import { Lato, Cinzel } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import ThemeRegistry from "@/components/theme-registry/theme-registry";
import { LanguageProvider } from "@/components/providers/language-provider";
import { TutorialProvider } from "@/components/providers/tutorial-provider";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-cinzel",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["100", "300", "400", "700", "900"],
  variable: "--font-lato",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JUNO LINK",
  description: "Navigate the era of discovery with Juno Link.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${cinzel.variable} ${lato.variable} antialiased`}>
        <LanguageProvider>
          <ThemeRegistry>
            <AuthProvider>
              <TutorialProvider>
                {children}
              </TutorialProvider>
            </AuthProvider>
          </ThemeRegistry>
        </LanguageProvider>
      </body>
    </html>
  );
}
