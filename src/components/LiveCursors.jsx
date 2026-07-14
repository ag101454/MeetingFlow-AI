import { useEffect, useState, useRef } from 'react';
import { usePresence } from '../hooks/usePresence';
import { getInitials } from '../lib/utils';
import { useAuthStore } from '../store/authStore';

const CURSOR_COLORS = [
  '#DB9941', '#AE2C11', '#39444D', '#10B981', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#F59E0B', '#6366F1', '#14B8A6',
];

export default function LiveCursors() {
  const { cursors, updateCursor, onlineUsers } = usePresence('global');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      updateCursor(e.clientX, e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [updateCursor]);

  // Filter out current user's cursor
  const otherCursors = Object.entries(cursors).filter(([id]) => {
    const user = onlineUsers.find(u => u.id === id);
    return user && user.id !== useAuthStore?.getState()?.user?.id;
  });

  return (
    <>
      {/* Other users' cursors */}
      {otherCursors.map(([userId, pos]) => {
        const user = onlineUsers.find(u => u.id === userId);
        if (!user || !pos) return null;
        
        const colorIndex = userId.charCodeAt(0) % CURSOR_COLORS.length;
        const color = CURSOR_COLORS[colorIndex];

        return (
          <div
            key={userId}
            className="fixed pointer-events-none z-[9999] transition-all duration-75"
            style={{
              left: pos.x + 'px',
              top: pos.y + 'px',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Cursor */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M5.65376 2.84698C5.21844 2.41079 4.5 2.71647 4.5 3.32384V19.6762C4.5 20.2835 5.21844 20.5892 5.65376 20.153L11.1464 14.6604C11.4614 14.3454 11.9383 14.25 12.3438 14.4189L18.9432 17.1789C19.5043 17.4106 20.0952 16.9721 20.0087 16.3714L17.8944 2.40351C17.8079 1.80282 17.0677 1.52592 16.5935 1.87027L12.0268 5.18029C11.6931 5.4224 11.2405 5.4224 10.9068 5.18029L6.34023 1.87027C5.866 1.52592 5.12584 1.80282 5.03936 2.40351L5 2.84698H5.65376Z"
                fill={color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            
            {/* Name Label */}
            <div
              className="absolute left-4 top-3 px-2 py-1 rounded-lg text-white text-xs font-medium whitespace-nowrap"
              style={{ backgroundColor: color }}
            >
              {user.name}
            </div>
          </div>
        );
      })}

      {/* Online Users Indicator */}
      <div className="fixed bottom-4 left-4 z-50 flex items-center space-x-2">
        <div className="flex -space-x-2">
          {onlineUsers.slice(0, 5).map((user, i) => (
            <div
              key={user.id}
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
              style={{
                backgroundColor: CURSOR_COLORS[user.id?.charCodeAt(0) % CURSOR_COLORS.length],
                zIndex: 5 - i,
              }}
              title={user.name}
            >
              {getInitials(user.name)}
            </div>
          ))}
          {onlineUsers.length > 5 && (
            <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-500 flex items-center justify-center text-xs font-bold text-white">
              +{onlineUsers.length - 5}
            </div>
          )}
        </div>
        <span className="text-xs text-gray-500 font-grotesk">
          {onlineUsers.length} online
        </span>
      </div>
    </>
  );
}
