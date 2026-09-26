import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let isFirebaseInitialized = false;

// Initialize Firebase Admin SDK strictly using service account credentials from environment
try {
  const projectId = (process.env.FIREBASE_PROJECT_ID || "").trim();
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || "";
  const privateKey = rawKey.replace(/\\n/g, "\n").trim();

  if (projectId && clientEmail && privateKey) {
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      isFirebaseInitialized = true;
      console.log("[INFO] Firebase Admin SDK initialized successfully");
    } else {
      isFirebaseInitialized = true;
    }
  } else {
    console.log(
      "[WARN] Firebase credentials incomplete in environment; push notifications disabled",
    );
  }
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.log(`[WARN] Firebase initialization error: ${msg}`);
}

export class FirebaseService {
  /**
   * Broadcast high-priority Emergency SOS push notification to guardian devices
   */
  static async sendSosNotification(
    fcmTokens: string[],
    data: {
      alertId: string | number;
      userName: string;
      latitude: number;
      longitude: number;
      batteryPercentage?: number;
    },
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!isFirebaseInitialized) {
      console.warn(
        `[WARN] Firebase not initialized; cannot dispatch SOS push notification for ${data.userName}`,
      );
      return { successCount: 0, failureCount: fcmTokens.length };
    }
    if (fcmTokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    try {
      const response = await getMessaging().sendEachForMulticast({
        tokens: fcmTokens,
        notification: {
          title: `🚨 EMERGENCY SOS: ${data.userName}`,
          body: `Emergency triggered at live coordinates (${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}). Open SAFORA immediately.`,
        },
        data: {
          type: "SOS_ALERT",
          alertId: String(data.alertId),
          latitude: String(data.latitude),
          longitude: String(data.longitude),
          battery:
            data.batteryPercentage != null
              ? String(data.batteryPercentage)
              : "unknown",
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: "high",
          notification: {
            channelId: "emergency_sos",
            sound: "default",
            color: "#EF4444",
          },
        },
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (err) {
      console.error("[ERROR] Failed to send Firebase SOS multicast:", err);
      return { successCount: 0, failureCount: fcmTokens.length };
    }
  }

  /**
   * Safe Walk Deviation Alert: sent when a user stays off-corridor without responding
   */
  static async sendSafeWalkDeviationAlert(
    fcmTokens: string[],
    data: {
      journeyId: string | number;
      userName: string;
      deviationMeters: number;
      latitude: number;
      longitude: number;
    },
  ): Promise<void> {
    if (!isFirebaseInitialized) {
      console.warn(
        `[WARN] Firebase not initialized; cannot dispatch Safe Walk deviation push alert for ${data.userName}`,
      );
      return;
    }
    if (fcmTokens.length === 0) return;

    try {
      await getMessaging().sendEachForMulticast({
        tokens: fcmTokens,
        notification: {
          title: `⚠️ Safe Walk Deviation Warning`,
          body: `${data.userName} has deviated ${Math.round(data.deviationMeters)}m from their planned route and timed out.`,
        },
        data: {
          type: "SAFE_WALK_DEVIATION",
          journeyId: String(data.journeyId),
          latitude: String(data.latitude),
          longitude: String(data.longitude),
        },
        android: {
          priority: "high",
          notification: {
            channelId: "safety_alerts",
            sound: "default",
            color: "#F59E0B",
          },
        },
      });
    } catch (err) {
      console.error(
        "[ERROR] Failed to dispatch Firebase Safe Walk alert:",
        err,
      );
    }
  }

  /**
   * Safe Walk Started Alert: sent to guardians when a user begins a Safe Walk escort session
   */
  static async sendSafeWalkStartedAlert(
    fcmTokens: string[],
    data: {
      journeyId: string | number;
      userName: string;
      destinationName?: string;
    },
  ): Promise<void> {
    if (!isFirebaseInitialized || fcmTokens.length === 0) return;

    try {
      await getMessaging().sendEachForMulticast({
        tokens: fcmTokens,
        notification: {
          title: `🛡️ Safe Walk Started`,
          body: `${data.userName} has started a Safe Walk${data.destinationName ? ` to ${data.destinationName}` : ""}. Open SAFORA to track live.`,
        },
        data: {
          type: "SAFE_WALK_STARTED",
          journeyId: String(data.journeyId),
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: "high",
          notification: {
            channelId: "safety_alerts",
            sound: "default",
            color: "#10B981",
          },
        },
      });
    } catch (err) {
      console.error(
        "[ERROR] Failed to dispatch Firebase Safe Walk started alert:",
        err,
      );
    }
  }

  /**
   * Safe Walk Arrival Alert: sent to guardians when user safely arrives at their destination
   */
  static async sendSafeWalkArrivalAlert(
    fcmTokens: string[],
    data: {
      journeyId: string | number;
      userName: string;
      destinationName?: string;
    },
  ): Promise<void> {
    if (!isFirebaseInitialized || fcmTokens.length === 0) return;

    try {
      await getMessaging().sendEachForMulticast({
        tokens: fcmTokens,
        notification: {
          title: `✅ Safe Arrival Confirmed`,
          body: `${data.userName} has arrived safely${data.destinationName ? ` at ${data.destinationName}` : ""}! Safe Walk session completed.`,
        },
        data: {
          type: "SAFE_WALK_ARRIVED",
          journeyId: String(data.journeyId),
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: "high",
          notification: {
            channelId: "safety_alerts",
            sound: "default",
            color: "#10B981",
          },
        },
      });
    } catch (err) {
      console.error(
        "[ERROR] Failed to dispatch Firebase Safe Walk arrival alert:",
        err,
      );
    }
  }

  /**
   * Safe Walk Cancelled Alert: sent to guardians when user stops/cancels their Safe Walk session
   */
  static async sendSafeWalkCancelledAlert(
    fcmTokens: string[],
    data: {
      journeyId: string | number;
      userName: string;
    },
  ): Promise<void> {
    if (!isFirebaseInitialized || fcmTokens.length === 0) return;

    try {
      await getMessaging().sendEachForMulticast({
        tokens: fcmTokens,
        notification: {
          title: `ℹ️ Safe Walk Ended`,
          body: `${data.userName} has ended their Safe Walk session.`,
        },
        data: {
          type: "SAFE_WALK_CANCELLED",
          journeyId: String(data.journeyId),
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: "normal",
          notification: {
            channelId: "safety_alerts",
            sound: "default",
          },
        },
      });
    } catch (err) {
      console.error(
        "[ERROR] Failed to dispatch Firebase Safe Walk cancelled alert:",
        err,
      );
    }
  }
}
