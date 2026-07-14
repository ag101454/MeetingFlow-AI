import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';

export function usePresence(room = 'global') {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [cursors, setCursors] = useState({});
  const user = useAuthStore((state) => state.user);
  const channelRef = { current: null };

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`presence-${room}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Track presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = [];
        const cursorsMap = {};

        Object.keys(state).forEach((key) => {
          const presences = state[key];
          if (presences && presences.length > 0) {
            const presence = presences[0];
            users.push({
              id: key,
              name: presence.name || 'Anonymous',
              email: presence.email,
              avatar: presence.avatar,
              onlineAt: presence.online_at,
              currentPage: presence.current_page,
              cursor: presence.cursor,
            });

            if (presence.cursor) {
              cursorsMap[key] = presence.cursor;
            }
          }
        });

        setOnlineUsers(users);
        setCursors(cursorsMap);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            name: user.user_metadata?.full_name || user.email,
            email: user.email,
            online_at: new Date().toISOString(),
            current_page: window.location.pathname,
            cursor: { x: 0, y: 0 },
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, room]);

  const updateCursor = useCallback((x, y) => {
    if (channelRef.current) {
      channelRef.current.track({
        name: user?.user_metadata?.full_name || user?.email,
        email: user?.email,
        online_at: new Date().toISOString(),
        current_page: window.location.pathname,
        cursor: { x, y },
      });
    }
  }, [user]);

  const updatePage = useCallback((page) => {
    if (channelRef.current) {
      channelRef.current.track({
        name: user?.user_metadata?.full_name || user?.email,
        email: user?.email,
        online_at: new Date().toISOString(),
        current_page: page,
        cursor: null,
      });
    }
  }, [user]);

  return {
    onlineUsers,
    cursors,
    updateCursor,
    updatePage,
  };
}