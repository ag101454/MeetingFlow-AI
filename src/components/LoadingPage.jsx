import { useState, useEffect } from 'react';
import SplashScreen from './SplashScreen';

export default function LoadingPage() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (!showSplash) {
    return null;
  }

  return <SplashScreen onComplete={handleSplashComplete} />;
}