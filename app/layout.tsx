import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SimpleAuthProvider } from "@/lib/optimized-auth-context";
import DemoModeIndicator from "@/components/DemoModeIndicator";
import { Navigation } from "@/components/Navigation";
import BottomTabBar from "@/components/ui/BottomTabBar";
import OfflineIndicator from "@/components/ui/OfflineIndicator";
import EdgeSwipeBack from "@/components/EdgeSwipeBack";
import MobileOnlyWrapper from "@/components/MobileOnlyWrapper";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: "Farm Manager - Ứng dụng di động quản lý trang trại",
  description: "Ứng dụng di động quản lý trang trại thông minh. Chỉ hỗ trợ trên điện thoại và máy tính bảng. Chụp ảnh AI, theo dõi cây trồng trực tiếp tại vườn.",
  keywords: [
    "farm management",
    "quản lý trang trại", 
    "agriculture",
    "nông nghiệp",
    "AI analysis",
    "phân tích AI",
    "Vietnam farming",
    "mobile app",
    "ứng dụng di động",
    "smartphone farming"
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
    title: "Farm Manager - Ứng dụng di động quản lý trang trại",
    description: "Ung dung di dong quan ly trang trai thong minh. Chi ho tro tren dien thoai va may tinh bang. Chup anh AI, theo doi cay trong truc tiep tai vuon.",
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
    title: "Farm Manager - Ứng dụng di động quản lý trang trại",
    description: "Ứng dụng di động quản lý trang trại thông minh. Chỉ hỗ trợ trên điện thoại và máy tính bảng. Chụp ảnh AI, theo dõi cây trồng trực tiếp tại vườn.",
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
        <MobileOnlyWrapper>
          <SimpleAuthProvider>
            <DemoModeIndicator />
            <Navigation />
            <EdgeSwipeBack />
            <OfflineIndicator />
            {children}
            <BottomTabBar />
          </SimpleAuthProvider>
        </MobileOnlyWrapper>
      </body>
    </html>
  );
}
