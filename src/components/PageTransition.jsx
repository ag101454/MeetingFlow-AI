import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function PageTransition({ children }) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState('fadeIn');

  useEffect(() => {
    if (location.pathname !== '/') {
      setTransitionStage('fadeOut');
      const timeout = setTimeout(() => {
        setDisplayChildren(children);
        setTransitionStage('fadeIn');
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setDisplayChildren(children);
    }
  }, [location, children]);

  return (
    <div
      className={`transition-all duration-300 ${
        transitionStage === 'fadeIn' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {displayChildren}
    </div>
  );
}