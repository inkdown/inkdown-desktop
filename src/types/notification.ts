export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number; // milliseconds, 0 or undefined = persistent
  actions?: NotificationAction[];
  data?: Record<string, any>;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'destructive';
}

export interface NotificationOptions {
  type?: NotificationType;
  title?: string;
  duration?: number;
  actions?: NotificationAction[];
  data?: Record<string, any>;
}