import { apiClient } from './api';
import { SosAlert, SosNotification } from '@safora/shared-types';

export interface SosResponse {
  success: boolean;
  message?: string;
  alert?: SosAlert;
  contactsNotified?: number;
}

export const sosService = {
  // Fetch inbound notifications / SOS feeds
  async getNotifications(): Promise<SosNotification[]> {
    try {
      const response = await apiClient.get<{ success: boolean; notifications: any[] }>('/notifications');
      if (response.data.notifications) {
        return response.data.notifications.map((n) => ({
          id: n.id,
          userId: n.user_id,
          senderId: n.sender_id,
          senderName: n.sender_name || 'Emergency Beacon',
          senderPhone: n.sender_phone,
          type: n.type || 'sos_alert',
          title: n.title,
          body: n.body,
          latitude: Number(n.latitude),
          longitude: Number(n.longitude),
          batteryPercentage: n.battery_percentage,
          audioUrl: n.audio_url,
          isTest: n.is_test,
          isRead: n.is_read,
          createdAt: n.created_at,
        }));
      }
      return [];
    } catch (err) {
      console.warn('[SOS Service] Could not fetch notifications:', err);
      return [];
    }
  },

  // Mark an emergency notification as resolved / acknowledged
  async markRead(notificationId: string | number): Promise<void> {
    await apiClient.patch(`/notifications/${notificationId}/read`);
  },

  async markAllRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  },

  // Direct trigger for testing dispatcher workflow
  async triggerDispatcherSOS(latitude: number, longitude: number, battery: number = 85): Promise<SosResponse> {
    const response = await apiClient.post<SosResponse>('/sos', {
      latitude,
      longitude,
      accuracy: 5.0,
      battery_percentage: battery,
    });
    return response.data;
  },
};
