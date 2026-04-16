import { create } from 'zustand';

const useAppStore = create((set) => ({
  notifications: [],
  sidebarOpen: true,
  
  addNotification: (notification) => set((state) => ({
    notifications: [
      { id: Date.now(), timestamp: new Date(), ...notification },
      ...state.notifications
    ].slice(0, 50)
  })),
  
  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => 
      n.id === id ? { ...n, is_read: true } : n
    )
  })),
  
  clearNotifications: () => set({ notifications: [] }),
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

export default useAppStore;
