import { memo, useEffect, useRef, useState } from 'react';
import { useNotificationStore } from '../../stores/notificationStore';
import type { Notification } from '../../types/notification';

interface NotificationItemProps {
  notification: Notification;
}

export const NotificationItem = memo(function NotificationItem({
  notification
}: NotificationItemProps) {
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const timeoutRef = useRef<number>();
  const removeTimeoutRef = useRef<number>();

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    if (notification.duration && notification.duration > 0) {
      timeoutRef.current = window.setTimeout(() => {
        handleRemove();
      }, notification.duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (removeTimeoutRef.current) {
        clearTimeout(removeTimeoutRef.current);
      }
    };
  }, [notification.duration]);

  const handleRemove = () => {
    if (isRemoving) return;
    
    setIsRemoving(true);
    setIsVisible(false);
    
    removeTimeoutRef.current = window.setTimeout(() => {
      removeNotification(notification.id);
    }, 300);
  };

  const getNotificationStyles = () => {
    return {
      backgroundColor: 'var(--theme-secondary)',
      borderColor: 'var(--theme-border)',
      color: 'var(--text-primary)'
    };
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return (
          <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--alert-tip-border)' }}>
            <svg className="w-3 h-3" style={{ color: 'var(--theme-background)' }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--alert-warning-border)' }}>
            <svg className="w-3 h-3" style={{ color: 'var(--theme-background)' }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--alert-important-border)' }}>
            <svg className="w-3 h-3" style={{ color: 'var(--theme-background)' }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'info':
      default:
        return (
          <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--alert-note-border)' }}>
            <svg className="w-3 h-3" style={{ color: 'var(--theme-background)' }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-out
        ${isVisible && !isRemoving 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
      `}
      style={{
        willChange: 'transform, opacity',
      }}
    >
      <div 
        className="relative overflow-hidden rounded-lg border shadow-lg backdrop-blur-sm"
        style={getNotificationStyles()}
      >
        {notification.duration && notification.duration > 0 && (
          <div className="absolute bottom-0 left-0 h-1" style={{ backgroundColor: 'var(--text-secondary)', opacity: 0.2 }}>
            <div
              className="h-full"
              style={{
                backgroundColor: 'var(--text-accent)',
                opacity: 0.6,
                width: '100%',
                animation: `shrink ${notification.duration}ms linear forwards`,
              }}
            />
          </div>
        )}
        
        <div className="flex items-start gap-3 p-4">
          {getIcon()}
          
          <div className="flex-1 min-w-0">
            {notification.title && (
              <p className="text-sm font-medium leading-5" style={{ color: 'var(--text-primary)' }}>
                {notification.title}
              </p>
            )}
            <p className={`text-sm leading-5 ${notification.title ? 'mt-1' : ''}`} style={{ color: 'var(--text-secondary)' }}>
              {notification.message}
            </p>
          </div>
          
          <button
            onClick={handleRemove}
            className="flex-shrink-0 ml-2 inline-flex focus:outline-none transition-colors duration-150"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
            aria-label="Dismiss notification"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
});