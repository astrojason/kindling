import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/Toast";
import { SiteFooter } from "@/components/legal/SiteFooter";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Kindling",
  description: "One short lesson a day, with a quick comprehension check.",
  applicationName: "Kindling",
  appleWebApp: {
    capable: true,
    title: "Kindling",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2ff" },
    { media: "(prefers-color-scheme: dark)", color: "#14112b" },
  ],
};

// Every page here is a per-signed-in-user view driven by client-side Firebase
// Auth + Firestore reads — never statically prerenderable.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full`}>
      <body className="group/app flex min-h-screen flex-col bg-bg font-sans text-fg antialiased">
        <div className="flex-1">
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
