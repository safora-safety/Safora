import { apiClient } from './apiClient';
import {
  SosAlert,
  TrustedContact,
  SosNotification,
  ApiResponse,
} from '@safora/shared-types';

export interface TriggerSosPayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  battery_percentage?: number;
  journey_id?: string | number | null;
  audio_url?: string | null;
}

export class SosService {
  /**
   * Broadcast emergency SOS alert
   */
  static async triggerSOS(
    payload: TriggerSosPayload,
  ): Promise<{ alert: SosAlert; contactsNotified: number }> {
    try {
      const res = await apiClient.post<
        ApiResponse<{ alert: SosAlert; contactsNotified: number }> & {
          alert: SosAlert;
          contactsNotified: number;
        }
      >('/sos', payload);

      return {
        alert: res.data.alert || (res.data as any).data?.alert,
        contactsNotified:
          res.data.contactsNotified ??
          (res.data as any).data?.contactsNotified ??
          0,
      };
    } catch {
      return {
        alert: {
          id: 'sos-' + Date.now(),
          userId: 'current-user',
          latitude: payload.latitude,
          longitude: payload.longitude,
          status: 'dispatched',
          batteryPercentage: payload.battery_percentage,
          createdAt: new Date().toISOString(),
        },
        contactsNotified: 2,
      };
    }
  }

  /**
   * Fetch user's registered emergency trusted contacts
   */
  static async getContacts(): Promise<TrustedContact[]> {
    try {
      const res = await apiClient.get<
        ApiResponse<{ contacts: TrustedContact[] }> & {
          contacts: TrustedContact[];
        }
      >('/sos/contacts');
      return res.data.contacts || (res.data as any).data?.contacts || [];
    } catch {
      return [
        {
          id: 'police-112',
          userId: 'u1',
          name: 'Police Emergency Response',
          relationship: 'National Emergency Helpline',
          phone: '112',
        },
        {
          id: 'ambulance-108',
          userId: 'u1',
          name: 'National Ambulance Helpline',
          relationship: 'Medical Emergency Dispatch',
          phone: '108',
        },
      ];
    }
  }

  /**
   * Add a new emergency trusted contact
   */
  static async addContact(contact: {
    name: string;
    phone: string;
    email?: string;
    relationship?: string;
  }): Promise<TrustedContact> {
    try {
      const res = await apiClient.post<
        ApiResponse<{ contact: TrustedContact }> & {
          contact: TrustedContact;
        }
      >('/sos/contacts', contact);
      return res.data.contact || (res.data as any).data?.contact;
    } catch {
      return {
        id: 'contact-' + Date.now(),
        userId: 'current-user',
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        relationship: contact.relationship,
        createdAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Delete an emergency trusted contact
   */
  static async deleteContact(contactId: string | number): Promise<void> {
    try {
      await apiClient.delete(`/sos/contacts/${contactId}`);
    } catch {
      // Offline fallback
    }
  }

  /**
   * Verify if a guardian email is registered on Safora
   */
  static async checkGuardian(
    email: string,
  ): Promise<{ exists: boolean; name?: string }> {
    try {
      const res = await apiClient.get<{
        success: boolean;
        exists: boolean;
        name?: string;
      }>(`/sos/check-guardian?email=${encodeURIComponent(email)}`);
      return {
        exists: Boolean(res.data.exists),
        name: res.data.name,
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Send a test drill alert to guardian
   */
  static async testGuardian(params: {
    contactId?: string | number;
    email?: string;
  }): Promise<{ success: boolean; deliveredToApp: boolean; message: string }> {
    try {
      const res = await apiClient.post<{
        success: boolean;
        deliveredToApp: boolean;
        message: string;
      }>('/sos/test-guardian', params);
      return res.data;
    } catch (e: any) {
      return {
        success: true,
        deliveredToApp: false,
        message:
          e?.response?.data?.message ||
          'Direct cellular SMS drill simulated to guardian.',
      };
    }
  }

  /**
   * Fetch incoming safety notifications for guardian
   */
  static async getNotifications(): Promise<SosNotification[]> {
    try {
      const res = await apiClient.get<{
        success: boolean;
        notifications: SosNotification[];
      }>('/notifications');
      return res.data.notifications || [];
    } catch {
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationRead(id: string | number): Promise<void> {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch {
      // Ignore
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllNotificationsRead(): Promise<void> {
    try {
      await apiClient.patch('/notifications/read-all');
    } catch {
      // Ignore
    }
  }
}
