import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "ClickCoin (Beta) - 오늘의 코인",
  description: "바로 오늘, 바로 당신을 위한 미니멀 코인 분석 플랫폼",
  alternates: {
    canonical: 'https://success365.kr/clickcoin/',
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3019486119649179"
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
        {children}
      </body>
    </html>
  );
}
