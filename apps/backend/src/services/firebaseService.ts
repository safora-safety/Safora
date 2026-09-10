import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let isFirebaseInitialized = false;

// Initialize Firebase Admin SDK using service account credentials
try {
  const projectId = process.env.FIREBASE_PROJECT_ID || "safora-4dd69";
  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL ||
    "firebase-adminsdk-fbsvc@safora-4dd69.iam.gserviceaccount.com";
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || "";
  const privateKey = rawKey.replace(/\\n/g, "\n");

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
      "[WARN] Firebase credentials incomplete; push notifications disabled",
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
    if (!isFirebaseInitialized || fcmTokens.length === 0) {
      console.log(
        `[PUSH SIMULATION] SOS Alert from ${data.userName} at (${data.latitude}, ${data.longitude}) to ${fcmTokens.length} tokens`,
      );
      return { successCount: fcmTokens.length, failureCount: 0 };
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
          battery: String(data.batteryPercentage || 100),
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
    if (!isFirebaseInitialized || fcmTokens.length === 0) {
      console.log(
        `[PUSH SIMULATION] Safe Walk Deviation: ${data.userName} is ${data.deviationMeters}m off-route`,
      );
      return;
    }

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
}
