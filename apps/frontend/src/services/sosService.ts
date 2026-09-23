import { apiClient } from './api';
import { SosAlert, SosNotification } from '@safora/shared-types';

export interface SosResponse {
  success: boolean;
  message?: string;
  alert?: SosAlert;
  contactsNotified?: number;
}

export interface AdminSosAlert {
  id: string | number;
  userId: string | number;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  journeyId?: string | number | null;
  latitude: number;
  longitude: number;
  accuracy?: number;
  batteryPercentage?: number;
  status: 'dispatched' | 'acknowledged' | 'resolved';
  source?: 'manual' | 'watchdog' | 'test' | string;
  audioUrl?: string | null;
  isTest?: boolean;
  createdAt?: string;
}

export const sosService = {
  // Fetch real citizen emergency alerts for operations staff queue
  async getAdminAlerts(): Promise<AdminSosAlert[]> {
    try {
      const response = await apiClient.get<{ success: boolean; alerts: any[] }>('/sos/alerts');
      if (response.data.alerts) {
        return response.data.alerts.map((a) => ({
          id: a.id,
          userId: a.user_id || a.userId,
          userName: a.user_name || a.userName || 'Citizen Beacon',
          userPhone: a.user_phone || a.userPhone,
          userEmail: a.user_email || a.userEmail,
          journeyId: a.journey_id || a.journeyId,
          latitude: Number(a.latitude),
          longitude: Number(a.longitude),
          accuracy: a.accuracy ? Number(a.accuracy) : undefined,
          batteryPercentage:
            a.battery_percentage !== undefined && a.battery_percentage !== null
              ? Number(a.battery_percentage)
              : a.batteryPercentage,
          status: a.status || 'dispatched',
          source: a.source || 'manual',
          audioUrl: a.audio_url || a.audioUrl,
          isTest: Boolean(a.is_test ?? a.isTest),
          createdAt: a.created_at || a.createdAt,
        }));
      }
      return [];
    } catch (err) {
      console.warn('[SOS Service] Could not fetch admin alerts:', err);
      return [];
    }
  },

  // Update alert status (staff only)
  async updateAlertStatus(
    alertId: string | number,
    status: 'dispatched' | 'acknowledged' | 'resolved',
  ): Promise<void> {
    await apiClient.patch(`/sos/${alertId}/status`, { status });
  },

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

  // Direct trigger for testing dispatcher workflow (Administrative Drill)
  async triggerDispatcherSOS(latitude: number, longitude: number, battery: number = 85): Promise<SosResponse> {
    const response = await apiClient.post<SosResponse>('/sos', {
      latitude,
      longitude,
      accuracy: 5.0,
      battery_percentage: battery,
      is_test: true,
    });
    return response.data;
  },
};
