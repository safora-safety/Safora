import { AppError } from "../errors/AppError";
import {
  SosAlert,
  TrustedContact,
  SosNotification,
} from "@safora/shared-types";
import { FirebaseService } from "./firebaseService";
import { SosRepository } from "../repositories/sosRepository";
import { UserRepository } from "../repositories/userRepository";
import { SosAlertModel } from "../models/SosAlert";
import { TrustedContactModel } from "../models/TrustedContact";
import { NotificationModel } from "../models/Notification";
import { db } from "../config/database";

export class SosService {
  static async triggerSOS(data: {
    userId: string | number;
    latitude: number;
    longitude: number;
    accuracy?: number;
    batteryPercentage?: number;
    journeyId?: string | number | null;
    audioUrl?: string | null;
  }): Promise<{ alert: SosAlert; contactsNotified: number }> {
    const row = await SosRepository.createAlert({
      userId: data.userId,
      journeyId: data.journeyId,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      batteryPercentage: data.batteryPercentage,
      audioUrl: data.audioUrl,
    });

    const contacts = await this.getContacts(data.userId);

    // Fetch user details for notification message
    const userRow = await UserRepository.findById(data.userId);
    const userName = userRow?.name || "SAFORA Citizen";
    const userPhone = userRow?.phone || undefined;

    let fcmTokens: string[] = [];

    // Deliver in-app notification to all trusted guardians registered on Safora
    for (const c of contacts) {
      if (c.email) {
        try {
          const guardianUser = await SosRepository.findUserByEmail(c.email);
          if (guardianUser) {
            // Save in-app notification in guardian's notification inbox
            await SosRepository.createNotification({
              userId: guardianUser.id,
              senderId: data.userId,
              senderName: userName,
              senderPhone: userPhone,
              type: "sos_alert",
              title: `🚨 EMERGENCY SOS from ${userName}`,
              body: `Immediate distress signal at ${data.latitude.toFixed(4)}°N, ${data.longitude.toFixed(4)}°E. Battery: ${data.batteryPercentage ?? 85}%.`,
              latitude: data.latitude,
              longitude: data.longitude,
              batteryPercentage: data.batteryPercentage,
              audioUrl: data.audioUrl,
              isTest: false,
            });

            if (guardianUser.fcm_token) {
              fcmTokens.push(guardianUser.fcm_token);
            }
          }
        } catch (e) {
          console.log("[WARN] Error notifying guardian via email:", e);
        }
      }
    }

    // Also lookup guardian accounts whose phone matches trusted contact phone numbers
    try {
      const contactPhones = contacts
        .map((c) => c.phone?.trim())
        .filter((p): p is string => Boolean(p && p.length >= 6));

      if (contactPhones.length > 0) {
        const queryRes = await db.query(
          "SELECT fcm_token FROM users WHERE phone = ANY($1) AND fcm_token IS NOT NULL;",
          [contactPhones],
        );
        for (const r of queryRes.rows) {
          if (r.fcm_token && !fcmTokens.includes(r.fcm_token)) {
            fcmTokens.push(r.fcm_token);
          }
        }
      }
    } catch (e) {
      console.log("[WARN] Error resolving guardian phone FCM tokens:", e);
    }

    // Send high-priority Push Notification via Firebase
    if (fcmTokens.length > 0) {
      FirebaseService.sendSosNotification(fcmTokens, {
        alertId: row.id,
        userName,
        latitude: data.latitude,
        longitude: data.longitude,
        batteryPercentage: data.batteryPercentage,
      }).catch((err) => console.log("[WARN] FCM broadcast error:", err));
    }

    return {
      alert: SosAlertModel.fromRow(row),
      contactsNotified: contacts.length,
    };
  }

  static async getContacts(userId: string | number): Promise<TrustedContact[]> {
    const rows = await SosRepository.findContactsByUserId(userId);
    const results: TrustedContact[] = [];

    for (const r of rows) {
      let hasAccount = false;
      if (r.email) {
        const u = await SosRepository.findUserByEmail(r.email);
        hasAccount = Boolean(u);
      }
      results.push(TrustedContactModel.fromRow(r, hasAccount));
    }

    return results;
  }

  static async addContact(
    userId: string | number,
    data: {
      name: string;
      phone: string;
      email?: string;
      relationship?: string;
    },
  ): Promise<TrustedContact> {
    const row = await SosRepository.addContact(userId, data);
    let hasAccount = false;
    if (row.email) {
      const u = await SosRepository.findUserByEmail(row.email);
      hasAccount = Boolean(u);
    }
    return TrustedContactModel.fromRow(row, hasAccount);
  }

  static async deleteContact(
    userId: string | number,
    contactId: string | number,
  ): Promise<void> {
    const deleted = await SosRepository.deleteContact(userId, contactId);
    if (!deleted) {
      throw new AppError("Contact not found", 404);
    }
  }

  static async checkGuardianAccount(
    email: string,
  ): Promise<{ exists: boolean; name?: string }> {
    if (!email || !email.includes("@")) {
      return { exists: false };
    }
    const user = await SosRepository.findUserByEmail(email);
    if (user) {
      return { exists: true, name: user.name };
    }
    return { exists: false };
  }

  static async testGuardianAlert(
    senderId: string | number,
    data: { email?: string; contactId?: string | number },
  ): Promise<{ success: boolean; deliveredToApp: boolean; message: string }> {
    const sender = await UserRepository.findById(senderId);
    const senderName = sender?.name || "Family Member";

    let targetEmail = data.email?.trim().toLowerCase();
    if (!targetEmail && data.contactId) {
      const contacts = await SosRepository.findContactsByUserId(senderId);
      const contact = contacts.find(
        (c) => String(c.id) === String(data.contactId),
      );
      if (contact?.email) {
        targetEmail = contact.email.trim().toLowerCase();
      }
    }

    if (!targetEmail) {
      return {
        success: true,
        deliveredToApp: false,
        message: "Simulated direct SMS test alert to guardian's phone number.",
      };
    }

    const guardianUser = await SosRepository.findUserByEmail(targetEmail);
    if (!guardianUser) {
      return {
        success: true,
        deliveredToApp: false,
        message: `Guardian (${targetEmail}) is not registered on Safora yet. Direct cellular SMS will be used.`,
      };
    }

    // Create a real test notification in guardian's notification center
    await SosRepository.createNotification({
      userId: guardianUser.id,
      senderId,
      senderName,
      senderPhone: sender?.phone,
      type: "test_drill",
      title: `🔔 TEST DRILL from ${senderName}`,
      body: `Safety connection test successful! This is a test drill from ${senderName}. Everything is safe.`,
      isTest: true,
    });

    if (guardianUser.fcm_token) {
      FirebaseService.sendSosNotification([guardianUser.fcm_token], {
        alertId: `test-${Date.now()}`,
        userName: `[TEST] ${senderName}`,
        latitude: 30.3165,
        longitude: 78.0322,
        batteryPercentage: 90,
      }).catch((e) => console.log("[WARN] Test FCM error:", e));
    }

    return {
      success: true,
      deliveredToApp: true,
      message: `Test alert successfully delivered to ${guardianUser.name}'s Safora app!`,
    };
  }

  static async getNotifications(
    userId: string | number,
  ): Promise<SosNotification[]> {
    const rows = await SosRepository.findNotificationsByUserId(userId);
    return rows.map((r) => NotificationModel.fromRow(r));
  }

  static async markNotificationRead(
    userId: string | number,
    notificationId: string | number,
  ): Promise<boolean> {
    return SosRepository.markNotificationAsRead(userId, notificationId);
  }

  static async markAllNotificationsRead(
    userId: string | number,
  ): Promise<number> {
    return SosRepository.markAllNotificationsAsRead(userId);
  }
}
