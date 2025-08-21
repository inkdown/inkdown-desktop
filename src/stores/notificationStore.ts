import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Notification, NotificationOptions, NotificationType } from '../types/notification';

interface NotificationState {
  notifications: Notification[];
  maxNotifications: number;
}

interface NotificationActions {
  addNotification: (message: string, options?: NotificationOptions) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  clearNotificationsByType: (type: NotificationType) => void;
  updateNotification: (id: string, updates: Partial<Notification>) => void;
  
  // Convenience methods
  showInfo: (message: string, title?: string, duration?: number) => string;
  showSuccess: (message: string, title?: string, duration?: number) => string;
  showWarning: (message: string, title?: string, duration?: number) => string;
  showError: (message: string, title?: string, duration?: number) => string;
}

type NotificationStore = NotificationState & NotificationActions;

const DEFAULT_DURATION = 4000; // 4 seconds
const MAX_NOTIFICATIONS = 5;

export const useNotificationStore = create<NotificationStore>()(
  subscribeWithSelector((set, get) => ({
    notifications: [],
    maxNotifications: MAX_NOTIFICATIONS,

    addNotification: (message: string, options: NotificationOptions = {}) => {
      const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const notification: Notification = {
        id,
        type: options.type || 'info',
        title: options.title,
        message,
        duration: options.duration !== undefined ? options.duration : DEFAULT_DURATION,
        actions: options.actions,
        data: options.data,
      };

      set((state) => {
        let newNotifications = [...state.notifications, notification];
        
        // Limit the number of notifications
        if (newNotifications.length > state.maxNotifications) {
          newNotifications = newNotifications.slice(-state.maxNotifications);
        }
        
        return { notifications: newNotifications };
      });

      return id;
    },

    removeNotification: (id: string) => {
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      }));
    },

    clearNotifications: () => {
      set({ notifications: [] });
    },

    clearNotificationsByType: (type: NotificationType) => {
      set((state) => ({
        notifications: state.notifications.filter(n => n.type !== type)
      }));
    },

    updateNotification: (id: string, updates: Partial<Notification>) => {
      set((state) => ({
        notifications: state.notifications.map(n => 
          n.id === id ? { ...n, ...updates } : n
        )
      }));
    },

    // Convenience methods
    showInfo: (message: string, title?: string, duration?: number) => {
      return get().addNotification(message, {
        type: 'info',
        title,
        duration: duration !== undefined ? duration : DEFAULT_DURATION
      });
    },

    showSuccess: (message: string, title?: string, duration?: number) => {
      return get().addNotification(message, {
        type: 'success',
        title,
        duration: duration !== undefined ? duration : DEFAULT_DURATION
      });
    },

    showWarning: (message: string, title?: string, duration?: number) => {
      return get().addNotification(message, {
        type: 'warning',
        title,
        duration: duration !== undefined ? duration : DEFAULT_DURATION
      });
    },

    showError: (message: string, title?: string, duration?: number) => {
      return get().addNotification(message, {
        type: 'error',
        title,
        duration: duration !== undefined ? duration : DEFAULT_DURATION * 2 // Errors stay longer
      });
    },
  }))
);

// Export convenience functions for easier use
export const {
  addNotification,
  removeNotification,
  clearNotifications,
  showInfo,
  showSuccess,
  showWarning,
  showError
} = useNotificationStore.getState();