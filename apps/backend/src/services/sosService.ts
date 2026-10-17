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
import { CloudinaryService } from "./cloudinaryService";
import {
  broadcastSosAlert,
  broadcastSosAudio,
  broadcastSosLiveAudioChunk,
} from "../sockets/journeySocket";
import { AudioStitcherService } from "./audioStitcherService";

export class SosService {
  static async triggerSOS(data: {
    userId: string | number;
    latitude: number;
    longitude: number;
    accuracy?: number;
    batteryPercentage?: number;
    journeyId?: string | number | null;
    audioUrl?: string | null;
    isTest?: boolean;
    source?: string | null;
  }): Promise<{ alert: SosAlert; contactsNotified: number }> {
    const finalAudioUrl = data.audioUrl || null;
    const isTest = Boolean(data.isTest);

    const row = await SosRepository.createAlert({
      userId: data.userId,
      journeyId: data.journeyId,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      batteryPercentage: data.batteryPercentage,
      audioUrl: finalAudioUrl,
      isTest,
      source: data.source || "user",
    });

    // Fetch user details for notification message
    const userRow = await UserRepository.findById(data.userId);
    const userName = userRow?.name || "SAFORA Citizen";
    const userPhone = userRow?.phone || undefined;

    // If this is an administrative or testing drill, isolate completely:
    // Do NOT notify personal emergency contacts, do NOT send real FCM push.
    if (isTest) {
      broadcastSosAlert({
        alertId: row.id,
        userId: data.userId,
        userName: `[DRILL TEST] ${userName}`,
        latitude: data.latitude,
        longitude: data.longitude,
        batteryPercentage: data.batteryPercentage,
        audioUrl: finalAudioUrl,
        isTest: true,
        source: "test",
      });

      return {
        alert: SosAlertModel.fromRow(row),
        contactsNotified: 0,
      };
    }

    const contacts = await this.getContacts(data.userId);
    const guardianUserIds: (string | number)[] = [];
    let fcmTokens: string[] = [];

    // Deliver in-app notification to all trusted guardians registered on Safora
    for (const c of contacts) {
      if (c.email) {
        try {
          const guardianUser = await SosRepository.findUserByEmail(c.email);
          if (guardianUser) {
            if (!guardianUserIds.includes(guardianUser.id)) {
              guardianUserIds.push(guardianUser.id);
            }
            // Save in-app notification in guardian's notification inbox
            await SosRepository.createNotification({
              userId: guardianUser.id,
              senderId: data.userId,
              senderName: userName,
              senderPhone: userPhone,
              type: "sos_alert",
              title: `🚨 EMERGENCY SOS from ${userName}`,
              body: `Immediate distress signal at ${data.latitude.toFixed(4)}°N, ${data.longitude.toFixed(4)}°E.${data.batteryPercentage != null ? ` Battery: ${data.batteryPercentage}%.` : ""}`,
              latitude: data.latitude,
              longitude: data.longitude,
              batteryPercentage: data.batteryPercentage,
              audioUrl: finalAudioUrl,
              sosAlertId: row.id,
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
      const normalizedPhones = contacts
        .map((c) => c.phone?.replace(/[^0-9]/g, "").slice(-10))
        .filter((p): p is string => Boolean(p && p.length === 10));

      if (normalizedPhones.length > 0) {
        const queryRes = await db.query(
          `SELECT id, fcm_token FROM users WHERE RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = ANY($1);`,
          [normalizedPhones],
        );
        for (const r of queryRes.rows) {
          if (!guardianUserIds.includes(r.id)) {
            guardianUserIds.push(r.id);
            // Save in-app notification for phone-matched guardian
            await SosRepository.createNotification({
              userId: r.id,
              senderId: data.userId,
              senderName: userName,
              senderPhone: userPhone,
              type: "sos_alert",
              title: `🚨 EMERGENCY SOS from ${userName}`,
              body: `Immediate distress signal at ${data.latitude.toFixed(4)}°N, ${data.longitude.toFixed(4)}°E.${data.batteryPercentage != null ? ` Battery: ${data.batteryPercentage}%.` : ""}`,
              latitude: data.latitude,
              longitude: data.longitude,
              batteryPercentage: data.batteryPercentage,
              audioUrl: finalAudioUrl,
              sosAlertId: row.id,
              isTest: false,
            });
          }
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

    // Broadcast emergency SOS strictly to authorized staff and confirmed guardians
    broadcastSosAlert({
      alertId: row.id,
      userId: data.userId,
      userName,
      latitude: data.latitude,
      longitude: data.longitude,
      batteryPercentage: data.batteryPercentage,
      audioUrl: finalAudioUrl,
      isTest: false,
      source: row.source || data.source || "user",
      guardianUserIds,
    });

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
      if (!hasAccount && r.phone) {
        const u = await SosRepository.findUserByPhone(r.phone);
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
    if (!hasAccount && row.phone) {
      const u = await SosRepository.findUserByPhone(row.phone);
      hasAccount = Boolean(u);
    }
    return TrustedContactModel.fromRow(row, hasAccount);
  }

  static async updateContact(
    userId: string | number,
    contactId: string | number,
    data: {
      name: string;
      phone: string;
      email?: string;
      relationship?: string;
    },
  ): Promise<TrustedContact> {
    const row = await SosRepository.updateContact(userId, contactId, data);
    if (!row) {
      throw new AppError("Contact not found or unauthorized", 404);
    }
    let hasAccount = false;
    if (row.email) {
      const u = await SosRepository.findUserByEmail(row.email);
      hasAccount = Boolean(u);
    }
    if (!hasAccount && row.phone) {
      const u = await SosRepository.findUserByPhone(row.phone);
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
    query: string,
  ): Promise<{ exists: boolean; name?: string }> {
    if (!query) {
      return { exists: false };
    }
    const trimmed = query.trim();
    if (trimmed.includes("@")) {
      const user = await SosRepository.findUserByEmail(trimmed);
      return { exists: Boolean(user), name: user?.name };
    }
    const user = await SosRepository.findUserByPhone(trimmed);
    return { exists: Boolean(user), name: user?.name };
  }

  static async testGuardianAlert(
    senderId: string | number,
    data: { contactId: string | number },
  ): Promise<{ success: boolean; deliveredToApp: boolean; message: string }> {
    const sender = await UserRepository.findById(senderId);
    const senderName = sender?.name || "Family Member";

    if (!data?.contactId) {
      throw new AppError(
        "contactId is required to test a guardian connection",
        400,
      );
    }

    const contacts = await SosRepository.findContactsByUserId(senderId);
    const contact = contacts.find(
      (c) => String(c.id) === String(data.contactId),
    );

    if (!contact) {
      throw new AppError(
        "Contact not found in your trusted contacts list",
        404,
      );
    }

    const targetEmail = contact.email?.trim().toLowerCase();
    let guardianUser: any = null;
    if (targetEmail) {
      guardianUser = await SosRepository.findUserByEmail(targetEmail);
    }
    if (!guardianUser && contact.phone) {
      guardianUser = await SosRepository.findUserByPhone(contact.phone);
    }

    if (!guardianUser) {
      return {
        success: true,
        deliveredToApp: false,
        message: targetEmail
          ? `Guardian (${targetEmail}) is not registered on Safora yet. Direct cellular SMS will be used.`
          : `Guardian phone (${contact.phone}) is not registered on Safora yet. Direct cellular SMS will be used.`,
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
        batteryPercentage: undefined,
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
    limit = 50,
    offset = 0,
  ): Promise<SosNotification[]> {
    const rows = await SosRepository.findNotificationsByUserId(
      userId,
      limit,
      offset,
    );
    return rows.map((r) => NotificationModel.fromRow(r));
  }

  static async getNotificationsPaginated(
    userId: string | number,
    limit = 50,
    offset = 0,
  ): Promise<{ notifications: SosNotification[]; totalCount: number }> {
    const [rows, totalCount] = await Promise.all([
      SosRepository.findNotificationsByUserId(userId, limit, offset),
      SosRepository.countNotificationsByUserId(userId),
    ]);
    return {
      notifications: rows.map((r) => NotificationModel.fromRow(r)),
      totalCount,
    };
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

  static async attachAudio(
    alertId: string | number,
    userId: string | number,
    audioUrl: string,
  ): Promise<SosAlert> {
    // Disarm server-side chunk stitching watchdog since complete master recording arrived
    AudioStitcherService.handleMasterUploaded(alertId);

    const row = await SosRepository.updateAudioUrl(alertId, userId, audioUrl);
    if (!row) {
      throw new AppError("SOS alert not found or unauthorized", 404);
    }
    const alert = SosAlertModel.fromRow(row);

    // Broadcast audio attachment to staff and user channel without re-alerting
    if (alert.audioUrl) {
      broadcastSosAudio({
        alertId: alert.id,
        userId: alert.userId,
        audioUrl: alert.audioUrl,
      });
    }

    return alert;
  }

  /**
   * Process a 5-second ambient audio chunk from either native REST or WebSocket.
   * Performs authorization, broadcasts to staff and guardians, and stages chunk for stitcher.
   */
  static async processAudioChunk(data: {
    alertId: string | number;
    userId: string | number;
    userRole?: string;
    seq: number;
    totalChunksExpected?: number;
    durationSec?: number;
    mimeType?: string;
    data: string;
    isLast: boolean;
    sampleRate?: number;
  }): Promise<{ success: boolean; seq: number; alertId: string | number }> {
    const alertIdNum = Number(data.alertId);
    if (isNaN(alertIdNum)) {
      throw new AppError("Invalid alert ID", 400);
    }

    let alert = await SosRepository.findById(alertIdNum);
    if (!alert) {
      // Rapid DB commit grace retry (protects against sub-second timing differences between HTTP SOS creation and first chunk)
      for (let i = 0; i < 4 && !alert; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        alert = await SosRepository.findById(alertIdNum);
      }
    }

    if (!alert) {
      throw new AppError("SOS alert not found", 404);
    }

    const isOwner =
      String(alert.user_id) === String(data.userId) ||
      Number(alert.user_id) === Number(data.userId);
    const isStaff = data.userRole === "admin" || data.userRole === "moderator";

    if (!isOwner && !isStaff) {
      throw new AppError(
        "Forbidden: Cannot stream audio for unowned SOS alert",
        403,
      );
    }

    console.log(
      `[AudioStream] Ingested live audio slice #${data.seq} for alert ${data.alertId} (${data.durationSec || 5}s, isLast=${Boolean(data.isLast)})`,
    );

    const guardianUserIds = await SosRepository.findGuardianUserIds(
      alert.user_id,
    );

    // 1. Instantly forward live audio slice to alert room, staff, and guardians
    broadcastSosLiveAudioChunk({
      alertId: data.alertId,
      seq: data.seq,
      totalChunksExpected: data.totalChunksExpected,
      durationSec: data.durationSec,
      mimeType: data.mimeType,
      data: data.data,
      isLast: data.isLast,
      guardianUserIds,
    });

    // 2. Disk staging & server watchdog management (auto-stitch fallback if client dies)
    AudioStitcherService.handleIncomingChunk({
      alertId: data.alertId,
      userId: data.userId,
      seq: data.seq,
      dataBase64: data.data,
      isLast: Boolean(data.isLast),
      sampleRate: data.sampleRate,
    }).catch((err) => {
      console.warn(
        `[AudioStream] Error staging audio chunk for alert ${data.alertId}:`,
        err,
      );
    });

    return {
      success: true,
      seq: data.seq,
      alertId: data.alertId,
    };
  }

  static async getAllAlerts(
    limit = 100,
    offset = 0,
    status?: string,
  ): Promise<any[]> {
    const rows = await SosRepository.findAllAlerts(limit, offset, status);
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name || "Anonymous Citizen",
      userPhone: r.user_phone || undefined,
      userEmail: r.user_email || undefined,
      journeyId: r.journey_id,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      accuracy: r.accuracy != null ? Number(r.accuracy) : undefined,
      batteryPercentage:
        r.battery_percentage != null ? Number(r.battery_percentage) : undefined,
      status: r.status,
      audioUrl: r.audio_url || undefined,
      isTest: Boolean(r.is_test),
      createdAt: r.created_at,
    }));
  }

  static async getAllAlertsPaginated(
    limit = 100,
    offset = 0,
    status?: string,
  ): Promise<{ alerts: any[]; totalCount: number }> {
    const [rows, totalCount] = await Promise.all([
      SosRepository.findAllAlerts(limit, offset, status),
      SosRepository.countAllAlerts(status),
    ]);
    return {
      alerts: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name || "Anonymous Citizen",
        userPhone: r.user_phone || undefined,
        userEmail: r.user_email || undefined,
        journeyId: r.journey_id,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        accuracy: r.accuracy != null ? Number(r.accuracy) : undefined,
        batteryPercentage:
          r.battery_percentage != null
            ? Number(r.battery_percentage)
            : undefined,
        status: r.status,
        audioUrl: r.audio_url || undefined,
        isTest: Boolean(r.is_test),
        createdAt: r.created_at,
      })),
      totalCount,
    };
  }

  static async updateStatus(
    alertId: string | number,
    status: string,
  ): Promise<SosAlert> {
    const allowed = ["dispatched", "acknowledged", "resolved"];
    if (!allowed.includes(status)) {
      throw new AppError(
        `Invalid status. Must be one of: ${allowed.join(", ")}`,
        400,
      );
    }
    const row = await SosRepository.updateAlertStatus(alertId, status);
    if (!row) {
      throw new AppError("SOS alert not found", 404);
    }
    return SosAlertModel.fromRow(row);
  }

  static async getPendingGuardianRequests(
    guardianUserId: string | number,
  ): Promise<any[]> {
    return SosRepository.findPendingRequestsForGuardian(guardianUserId);
  }

  static async getWardsForGuardian(
    guardianUserId: string | number,
  ): Promise<any[]> {
    return SosRepository.findWardsForGuardian(guardianUserId);
  }

  static async respondToGuardianRequest(
    contactId: string | number,
    guardianUserId: string | number,
    action: "accept" | "decline",
  ): Promise<any> {
    const updated = await SosRepository.respondToGuardianRequest(
      contactId,
      guardianUserId,
      action,
    );
    if (!updated) {
      throw new AppError("Guardian request not found", 404);
    }
    return updated;
  }
}
