import { AppError } from "../errors/AppError";
import { SosAlert, TrustedContact } from "@safora/shared-types";
import { FirebaseService } from "./firebaseService";
import { SosRepository } from "../repositories/sosRepository";
import { UserRepository } from "../repositories/userRepository";
import { SosAlertModel } from "../models/SosAlert";
import { TrustedContactModel } from "../models/TrustedContact";
import { db } from "../config/database";

export class SosService {
  static async triggerSOS(data: {
    userId: string | number;
    latitude: number;
    longitude: number;
    accuracy?: number;
    batteryPercentage?: number;
    journeyId?: string | number | null;
  }): Promise<{ alert: SosAlert; contactsNotified: number }> {
    const row = await SosRepository.createAlert({
      userId: data.userId,
      journeyId: data.journeyId,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      batteryPercentage: data.batteryPercentage,
    });

    const contacts = await this.getContacts(data.userId);

    // Fetch user name and dispatch push notification via Firebase Admin SDK
    const userRow = await UserRepository.findById(data.userId);
    const userName = userRow?.name || "SAFORA User";

    // Lookup guardian accounts whose phone matches trusted contact phone numbers
    let fcmTokens: string[] = [];
    try {
      const contactPhones = contacts
        .map((c) => c.phone?.trim())
        .filter((p): p is string => Boolean(p && p.length >= 6));

      if (contactPhones.length > 0) {
        const queryRes = await db.query(
          "SELECT fcm_token FROM users WHERE phone = ANY($1) AND fcm_token IS NOT NULL;",
          [contactPhones],
        );
        fcmTokens = queryRes.rows.map((r: any) => r.fcm_token).filter(Boolean);
      }
    } catch (e) {
      console.log("[WARN] Error resolving guardian FCM tokens:", e);
    }

    FirebaseService.sendSosNotification(fcmTokens, {
      alertId: row.id,
      userName,
      latitude: data.latitude,
      longitude: data.longitude,
      batteryPercentage: data.batteryPercentage,
    }).catch((err) => console.log("[WARN] FCM broadcast error:", err));

    return {
      alert: SosAlertModel.fromRow(row),
      contactsNotified: contacts.length,
    };
  }

  static async getContacts(userId: string | number): Promise<TrustedContact[]> {
    const rows = await SosRepository.findContactsByUserId(userId);
    return rows.map((r) => TrustedContactModel.fromRow(r));
  }

  static async addContact(
    userId: string | number,
    data: { name: string; phone: string; relationship?: string },
  ): Promise<TrustedContact> {
    const row = await SosRepository.addContact(userId, data);
    return TrustedContactModel.fromRow(row);
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
}
