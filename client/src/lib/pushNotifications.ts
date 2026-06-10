import { apiRequest, getAuthToken } from './queryClient';

const FALLBACK_VAPID_PUBLIC_KEY =
  'BKZ0LNy05CTv807lF4dSwM3wB7nxrBHXDP5AYPvbCCPZYWrK08rTYFQO6BmKrW3f0xmIe5wUxtLN67XOSQ7W--o';

export class PushNotificationService {
  private static instance: PushNotificationService;
  private registration: ServiceWorkerRegistration | null = null;
  private initPromise: Promise<void> | null = null;
  private vapidPublicKey: string | null = null;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.initializeServiceWorker();
    return this.initPromise;
  }

  private async initializeServiceWorker(): Promise<void> {
    try {
      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported');
        return;
      }

      // Check if push messaging is supported
      if (!('PushManager' in window)) {
        console.warn('Push messaging not supported');
        return;
      }

      // Register service worker
      this.registration = await navigator.serviceWorker.register('/assets/service-worker.js');
      console.log('Service Worker registered successfully');

      // Wait for the service worker to be ready
      this.registration = await navigator.serviceWorker.ready;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  private async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Desktop notifications not supported');
      return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return false;
    }
    return true;
  }

  async ensureSubscribed(): Promise<void> {
    try {
      await this.initialize();

      if (!this.registration) {
        console.error('Service Worker not registered');
        return;
      }

      if (!getAuthToken()) {
        console.warn('Push subscription deferred until authentication is ready');
        return;
      }

      const permissionGranted = await this.requestNotificationPermission();
      if (!permissionGranted) return;

      const vapidPublicKey = await this.getVapidPublicKey();
      const expectedApplicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);

      // Check if already subscribed
      let existingSubscription = await this.registration.pushManager.getSubscription();
      if (existingSubscription) {
        const existingKey = existingSubscription.options?.applicationServerKey;
        if (existingKey && !this.arrayBuffersEqual(existingKey, expectedApplicationServerKey)) {
          await existingSubscription.unsubscribe();
          existingSubscription = null;
        }
      }

      if (existingSubscription) {
        await this.saveSubscription(existingSubscription);
        console.log('Push subscription refreshed on server');
        return;
      }

      // Subscribe to push notifications
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: expectedApplicationServerKey,
      });

      console.log('Push subscription successful:', subscription);
      await this.saveSubscription(subscription);

      console.log('Push subscription saved to server');
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    }
  }

  private async saveSubscription(subscription: PushSubscription): Promise<void> {
    await apiRequest('POST', '/api/push/subscribe', {
      subscription: subscription.toJSON(),
    });
  }

  private async getVapidPublicKey(): Promise<string> {
    if (this.vapidPublicKey) return this.vapidPublicKey;

    const envKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY || import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (envKey) {
      const key = String(envKey);
      this.vapidPublicKey = key;
      return key;
    }

    try {
      const response = await fetch('/api/push/config', { credentials: 'include' });
      if (response.ok) {
        const config = await response.json();
        const key = String(config?.publicKey || '').trim();
        if (key) {
          this.vapidPublicKey = key;
          return key;
        }
      }
    } catch (error) {
      console.warn('Failed to load push config:', error);
    }

    this.vapidPublicKey = FALLBACK_VAPID_PUBLIC_KEY;
    return this.vapidPublicKey;
  }

  private arrayBuffersEqual(left: ArrayBuffer | null, right: Uint8Array): boolean {
    if (!left) return false;
    const leftBytes = new Uint8Array(left);
    if (leftBytes.byteLength !== right.byteLength) return false;
    for (let index = 0; index < leftBytes.byteLength; index += 1) {
      if (leftBytes[index] !== right[index]) return false;
    }
    return true;
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async sendTestNotification(): Promise<void> {
    try {
      await apiRequest('POST', '/api/push/send', {
        title: 'Test Notification',
        body: 'This is a test push notification from BOTA!',
        data: {
          type: 'test',
          url: '/',
        },
      });
      console.log('Test notification sent');
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  }

  async unsubscribe(): Promise<void> {
    try {
      if (!this.registration) {
        console.error('Service Worker not registered');
        return;
      }

      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await apiRequest('POST', '/api/push/unsubscribe', { endpoint });
        console.log('Push subscription cancelled');
      }
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
    }
  }
}

// Initialize push notifications when the module is loaded
export const pushNotificationService = PushNotificationService.getInstance();
