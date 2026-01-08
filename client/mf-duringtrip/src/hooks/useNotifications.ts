import { useState, useEffect, useCallback } from 'react';

export interface NotificationState {
  permission: NotificationPermission;
  isSupported: boolean;
}

export interface UseNotificationsReturn extends NotificationState {
  requestPermission: () => Promise<void>;
  sendNotification: (title: string, options?: NotificationOptions) => void;
  registration: ServiceWorkerRegistration | null;
}

/**
 * Hook for managing push notifications
 *
 * Features:
 * - Check if notifications are supported
 * - Request notification permission
 * - Send test notifications via Service Worker (better cross-browser support)
 */
export const useNotifications = (): UseNotificationsReturn => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if notifications are supported and get Service Worker registration
  useEffect(() => {
    const supported = 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);

      // Get Service Worker registration for better notification support
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => {
            setRegistration(reg);
            if (import.meta.env.DEV) {
              console.log('Service Worker ready for notifications');
            }
          })
          .catch((error) => {
            if (import.meta.env.DEV) {
              console.error('Service Worker not available:', error);
            }
          });
      }
    }
  }, []);

  /**
   * Request notification permission from the user
   */
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      if (import.meta.env.DEV) {
        console.warn('Notifications are not supported in this browser');
      }
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error requesting notification permission:', error);
      }
    }
  }, [isSupported]);

  /**
   * Send a notification using Service Worker (better cross-browser support)
   */
  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported) {
        if (import.meta.env.DEV) {
          console.warn('Notifications are not supported');
        }
        return;
      }

      if (permission !== 'granted') {
        if (import.meta.env.DEV) {
          console.warn('Notification permission not granted');
        }
        return;
      }

      try {
        // Use Service Worker if available (better cross-browser support, especially Firefox on macOS)
        if (registration && registration.active) {
          if (import.meta.env.DEV) {
            console.log('Sending notification via Service Worker');
          }

          // Send message to Service Worker to show notification
          registration.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            title,
            options: {
              body: options?.body || '',
              icon: options?.icon || '/icon-192x192.png',
              badge: options?.badge || '/icon-72x72.png',
              tag: options?.tag || 'default',
              requireInteraction: options?.requireInteraction || false,
              data: options?.data || {},
            },
          });
        } else {
          // Fallback to basic Notification API if Service Worker not available
          if (import.meta.env.DEV) {
            console.log('Sending notification via Notification API (fallback)');
          }
          const notification = new Notification(title, {
            icon: '/icon-192x192.png',
            badge: '/icon-72x72.png',
            ...options,
          });

          // Auto-close notification after 5 seconds
          setTimeout(() => {
            notification.close();
          }, 5000);

          // Handle notification click
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error sending notification:', error);
        }
      }
    },
    [isSupported, permission, registration]
  );

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
    registration,
  };
};
