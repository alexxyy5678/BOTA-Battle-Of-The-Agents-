import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  challengeNotifications: boolean;
  eventNotifications: boolean;
  friendNotifications: boolean;
}

export function useNotificationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    challengeNotifications: true,
    eventNotifications: true,
    friendNotifications: true,
  });

  const { data: preferences } = useQuery({
    queryKey: ['/api/notifications/preferences'],
    queryFn: () => apiRequest('GET', '/api/notifications/preferences'),
    enabled: !!user,
  });

  // Load settings from the notification preferences table.
  useEffect(() => {
    if (preferences && typeof preferences === 'object') {
      const prefs = preferences as {
        enablePush?: boolean;
        enableInApp?: boolean;
      };
      setSettings(prev => ({
        ...prev,
        pushNotifications: prefs.enablePush ?? prev.pushNotifications,
        challengeNotifications: prefs.enableInApp ?? prev.challengeNotifications,
        eventNotifications: prefs.enableInApp ?? prev.eventNotifications,
        friendNotifications: prefs.enableInApp ?? prev.friendNotifications,
      }));
    }
  }, [preferences]);

  function toServerPreferences(nextSettings: NotificationSettings) {
    const enableInApp =
      nextSettings.challengeNotifications ||
      nextSettings.eventNotifications ||
      nextSettings.friendNotifications;

    return {
      enablePush: nextSettings.pushNotifications,
      enableTelegram: false,
      enableInApp,
      notificationFrequency: 'immediate',
      mutedChallenges: [],
      mutedUsers: [],
    };
  }

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await apiRequest('PUT', '/api/notifications/preferences', toServerPreferences(newSettings));
      toast({
        title: 'Setting Updated',
        description: 'Your notification preference has been saved.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences'] });
    } catch (error) {
      // Revert on error
      setSettings(settings);
      toast({
        title: 'Error',
        description: 'Failed to update notification setting.',
        variant: 'destructive',
      });
    }
  };

  return {
    settings,
    updateSetting,
    isUpdating: false,
  };
}
