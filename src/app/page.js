import { Suspense } from 'react';
import CoinAnalysisClient from './CoinAnalysisClient';


export const metadata = {
  title: "ClickCoin (Beta) - 오늘의 코인",
  description: "바로 오늘, 바로 당신을 위한 미니멀 코인 분석 플랫폼",
};

export default function Home() {
  // Default symbol for the root page
  return (
    <Suspense fallback={null}>
      <CoinAnalysisClient symbol="BTC-USD" />
    </Suspense>
  );
}

