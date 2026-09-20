import { Platform } from 'react-native';
import { getBatteryLevel } from 'react-native-device-info';
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
   * Broadcast emergency SOS alert with real GPS and battery telemetry
   */
  static async triggerSOS(payload: TriggerSosPayload): Promise<{
    alert: SosAlert;
    contactsNotified: number;
    isOffline?: boolean;
  }> {
    let batteryPercentage = payload.battery_percentage;
    if (batteryPercentage === undefined) {
      try {
        const level = await getBatteryLevel();
        if (typeof level === 'number' && !isNaN(level) && level >= 0) {
          batteryPercentage = Math.round(level * 100);
        }
      } catch {
        // Device doesn't support battery reading (e.g. simulator)
      }
    }

    const res = await apiClient.post<
      ApiResponse<{ alert: SosAlert; contactsNotified: number }> & {
        alert: SosAlert;
        contactsNotified: number;
      }
    >('/sos', {
      ...payload,
      battery_percentage: batteryPercentage,
    });

    return {
      alert: res.data.alert || (res.data as any).data?.alert,
      contactsNotified:
        res.data.contactsNotified ??
        (res.data as any).data?.contactsNotified ??
        0,
      isOffline: false,
    };
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
      return [];
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
    const res = await apiClient.post<
      ApiResponse<{ contact: TrustedContact }> & {
        contact: TrustedContact;
      }
    >('/sos/contacts', contact);
    return res.data.contact || (res.data as any).data?.contact;
  }

  /**
   * Update an existing emergency trusted contact
   */
  static async updateContact(
    contactId: string | number,
    contact: {
      name: string;
      phone: string;
      email?: string;
      relationship?: string;
    },
  ): Promise<TrustedContact> {
    const res = await apiClient.put<
      ApiResponse<{ contact: TrustedContact }> & {
        contact: TrustedContact;
      }
    >(`/sos/contacts/${contactId}`, contact);
    return res.data.contact || (res.data as any).data?.contact;
  }

  /**
   * Delete an emergency trusted contact
   */
  static async deleteContact(contactId: string | number): Promise<void> {
    await apiClient.delete(`/sos/contacts/${contactId}`);
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
    contactId: string | number;
  }): Promise<{ success: boolean; deliveredToApp: boolean; message: string }> {
    try {
      const res = await apiClient.post<{
        success: boolean;
        deliveredToApp: boolean;
        message: string;
      }>('/sos/test-guardian', { contactId: params.contactId });
      return res.data;
    } catch (e: any) {
      return {
        success: false,
        deliveredToApp: false,
        message:
          e?.response?.data?.message ||
          'Failed to send drill alert. Please check your internet connection.',
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

  /**
   * Upload real ambient audio evidence to backend Cloudinary service
   */
  static async uploadAudio(audioUri: string): Promise<{ audioUrl: string }> {
    const formData = new FormData();
    const cleanUri =
      Platform.OS === 'android' ? audioUri : audioUri.replace('file://', '');
    formData.append('audio', {
      uri: cleanUri,
      type: 'audio/m4a',
      name: `sos_recording_${Date.now()}.m4a`,
    } as any);

    const res = await apiClient.post<{
      success: boolean;
      audioUrl: string;
      publicId: string;
    }>('/sos/upload-audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return { audioUrl: res.data.audioUrl };
  }

  /**
   * Attach uploaded audio evidence URL to existing SOS alert record
   */
  static async attachAudioToAlert(
    alertId: string | number,
    audioUrl: string,
  ): Promise<void> {
    await apiClient.patch(`/sos/${alertId}/audio`, {
      audio_url: audioUrl,
    });
  }
}
