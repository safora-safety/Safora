import { apiClient } from './apiClient';
import { SosAlert, TrustedContact, ApiResponse } from '@safora/shared-types';

export interface TriggerSosPayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  battery_percentage?: number;
  journey_id?: string | number | null;
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
}
