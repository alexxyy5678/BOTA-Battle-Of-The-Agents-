import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useEffect } from 'react';
import { pusher } from '@/lib/pusher';
import { useToast } from './use-toast';
import type { BotaNotificationData } from '@shared/botaNotifications';

/**
 * Hook for managing BOTA per-agent activity notifications
 * Provides real-time updates for match events, payouts, tool drops, etc.
 */
export function useBotaNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch notifications for the authenticated user's agents
  const isTestMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('test') === 'true';
  
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/bantahbro/notifications'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/bantahbro/notifications');
      return Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string | number) =>
      apiRequest('PATCH', `/api/bantahbro/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bantahbro/notifications'] });
    },
  });

  // Dismiss notification
  const dismissMutation = useMutation({
    mutationFn: (notificationId: string | number) =>
      apiRequest('DELETE', `/api/bantahbro/notifications/${notificationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bantahbro/notifications'] });
    },
  });

  // Set up real-time notifications via Pusher
  useEffect(() => {
    if (!user?.id) return;

    const channel = pusher.subscribe(`bota-user-${user.id}`);

    const eventTypes = [
      'bota:agent-queued',
      'bota:match-found',
      'bota:battle-won',
      'bota:battle-lost',
      'bota:royale-result',
      'bota:pot-payout',
      'bota:tool-drop',
    ];

    eventTypes.forEach((eventName) => {
      channel.bind(eventName, (data: BotaNotificationData) => {
        console.log(`[BOTA] ${eventName}:`, data);

        // Show toast notification for realtime events
        toast({
          title: `${data.agentName} • ${eventName.split(':')[1].toUpperCase()}`,
          description: formatNotificationMessageForToast(data),
          duration: 5000,
        });

        // Refresh notifications list
        queryClient.invalidateQueries({ queryKey: ['/api/bantahbro/notifications'] });
      });
    });

    return () => {
      eventTypes.forEach((eventName) => {
        channel.unbind(eventName);
      });
      pusher.unsubscribe(`bota-user-${user.id}`);
    };
  }, [user?.id, queryClient, toast]);

  return {
    notifications: notifications as (BotaNotificationData & { id: string | number })[] || [],
    isLoading,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    dismiss: dismissMutation.mutate,
    unreadCount: Array.isArray(notifications)
      ? notifications.filter((n: any) => !n.read).length
      : 0,
  };
}

function formatNotificationMessageForToast(data: BotaNotificationData): string {
  switch (data.eventType) {
    case 'queued':
      return 'Agent entered matchmaking';
    case 'match_found':
      return `Matched vs ${data.opponentName}`;
    case 'win':
      return `Victory! +${data.earnedBC} BC`;
    case 'loss':
      return `Lost to ${data.opponentName}`;
    case 'royale_result':
      return `Top ${data.placement} finish`;
    case 'pot_payout':
      return `+${data.payoutAmount} ${data.payoutCurrency}`;
    case 'tool_drop':
      return `New tool: ${data.toolName}`;
    default:
      return 'New activity';
  }
}
