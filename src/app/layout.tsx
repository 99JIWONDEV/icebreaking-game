import type { Metadata, Viewport } from "next";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { INTRO_CACHE_MS } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "EM · KM 아이스브레이킹",
  description: "EM·KM 합동 모임을 위한 아이스브레이킹 질문 카드",
};

export const viewport: Viewport = {
  // <meta name="theme-color"> needs a literal value (can't reference a CSS custom property) — keep in sync with --color-canvas in globals.css
  themeColor: "#fafaf9",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

// 인트로를 10분 이내 다시 보지 않도록, 페인트 전에 <html data-intro="skip">을 설정한다.
// globals.css의 html[data-intro="skip"] #intro-splash { display:none } 과 짝이다.
const introSkipScript = `(function(){try{var r=localStorage.getItem('icebreaker:introSeenAt');if(r&&Date.now()-Number(r)<${INTRO_CACHE_MS}){document.documentElement.setAttribute('data-intro','skip')}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introSkipScript }} />
      </head>
      <body className="min-h-full">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
