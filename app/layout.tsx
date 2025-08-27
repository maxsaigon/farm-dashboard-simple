import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { EnhancedAuthProvider } from "@/lib/enhanced-auth-context";
import { Navigation } from "@/components/Navigation";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Farm Manager - Quản lý trang trại thông minh",
  description: "Ứng dụng quản lý trang trại thông minh cho việc theo dõi cây trồng, chụp ảnh AI và phân tích sức khỏe cây.",
  keywords: [
    "farm management",
    "quản lý trang trại", 
    "agriculture",
    "nông nghiệp",
    "AI analysis",
    "phân tích AI",
    "Vietnam farming"
  ],
  authors: [{ name: "Farm Manager Team" }],
  creator: "Farm Manager",
  publisher: "Farm Manager",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Farm Manager",
    statusBarStyle: "default",
    startupImage: "/icons/apple-touch-startup-image.png",
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  applicationName: "Farm Manager",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon.png",
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/icons/apple-touch-icon.png",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "https://farm-manager.vercel.app",
    siteName: "Farm Manager",
    title: "Farm Manager - Quản lý trang trại thông minh",
    description: "Ứng dụng quản lý trang trại thông minh cho việc theo dõi cây trồng, chụp ảnh AI và phân tích sức khỏe cây.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Farm Manager Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Farm Manager - Quản lý trang trại thông minh",
    description: "Ứng dụng quản lý trang trại thông minh cho việc theo dõi cây trồng, chụp ảnh AI và phân tích sức khỏe cây.",
    images: ["/og-image.jpg"],
    creator: "@farmmanager",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#16a34a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <EnhancedAuthProvider>
          <Navigation />
          {children}
        </EnhancedAuthProvider>
      </body>
    </html>
  );
}
