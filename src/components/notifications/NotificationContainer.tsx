import { memo, useEffect, useState } from 'react';
import { useNotificationStore } from '../../stores/notificationStore';
import { NotificationItem } from './NotificationItem';

export const NotificationContainer = memo(function NotificationContainer() {
  const notifications = useNotificationStore((state) => state.notifications);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if(mounted) return;

    setMounted(true);
  }, []);

  if (!mounted || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
        />
      ))}
    </div>
  );
});