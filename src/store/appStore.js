import { create } from 'zustand';

export const useAppStore = create((set) => ({
  sidebarOpen: true,
  theme: 'light',
  currentView: 'dashboard',
  selectedProject: null,
  selectedMeeting: null,
  notifications: [],
  
  toggleSidebar: () => set((state) => ({ 
    sidebarOpen: !state.sidebarOpen 
  })),
  
  setTheme: (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },
  
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedProject: (project) => set({ selectedProject: project }),
  setSelectedMeeting: (meeting) => set({ selectedMeeting: meeting }),
  
  addNotification: (notification) => set((state) => ({
    notifications: [
      { id: Date.now(), ...notification, read: false, timestamp: new Date() },
      ...state.notifications
    ].slice(0, 50)
  })),
  
  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    )
  })),
  
  clearNotifications: () => set({ notifications: [] }),
}));