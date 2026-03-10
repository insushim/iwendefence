import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Black_Han_Sans } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "@/shared/ui/ServiceWorkerRegistrar";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
});

const blackHanSans = Black_Han_Sans({
  variable: "--font-black-han-sans",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WordGuard - 영단어 디펜스",
  description:
    "단어로 지키는 마법의 왕국! 영단어를 학습하며 타워 디펜스 게임을 즐기세요.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#6366F1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${notoSansKr.variable} ${blackHanSans.variable} antialiased`}
      >
        <ServiceWorkerRegistrar />
        <div id="modal-root" />
        {children}
      </body>
    </html>
  );
}
