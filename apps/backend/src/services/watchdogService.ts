import { JourneyRepository } from "../repositories/journeyRepository";
import { SosService } from "./sosService";

export interface WatchdogState {
  deviatedAt: Date | null;
  lastLocation: { lat: number; lng: number } | null;
}

export class WatchdogService {
  private static activeJourneys = new Map<number, WatchdogState>();
  private static tickInterval: NodeJS.Timeout | null = null;

  /**
   * Populate activeJourneys from PostgreSQL on server startup
   * (Known V1 limitation documented in architecture.md: deviations during reboot window may need next ping)
   */
  static async initialize(): Promise<void> {
    try {
      const rows = await JourneyRepository.findActiveForWatchdog();
      for (const row of rows) {
        this.activeJourneys.set(Number(row.id), {
          deviatedAt: row.deviated_at ? new Date(row.deviated_at) : null,
          lastLocation: null,
        });
      }
      console.log(
        `[Watchdog] Bootstrapped with ${this.activeJourneys.size} active journey(s) from database`,
      );
    } catch (err) {
      console.warn("[Watchdog] Failed to bootstrap from database:", err);
    }
  }

  static registerJourney(journeyId: number): void {
    const id = Number(journeyId);
    this.activeJourneys.set(id, {
      deviatedAt: null,
      lastLocation: null,
    });
  }

  static unregisterJourney(journeyId: number): void {
    this.activeJourneys.delete(Number(journeyId));
  }

  static setDeviated(journeyId: number, date = new Date()): void {
    const id = Number(journeyId);
    const existing = this.activeJourneys.get(id);
    if (existing) {
      if (!existing.deviatedAt) {
        existing.deviatedAt = date;
      }
    } else {
      this.activeJourneys.set(id, {
        deviatedAt: date,
        lastLocation: null,
      });
    }
  }

  static clearDeviated(journeyId: number): void {
    const id = Number(journeyId);
    const existing = this.activeJourneys.get(id);
    if (existing) {
      existing.deviatedAt = null;
    }
  }

  static updateLocation(journeyId: number, lat: number, lng: number): void {
    const id = Number(journeyId);
    const existing = this.activeJourneys.get(id);
    if (existing) {
      existing.lastLocation = { lat, lng };
    } else {
      this.activeJourneys.set(id, {
        deviatedAt: null,
        lastLocation: { lat, lng },
      });
    }
  }

  /**
   * Run one watchdog check across all in-memory tracked active journeys.
   * Escalates any journey whose deviatedAt is older than 60 seconds.
   */
  static async scan(): Promise<{ scanned: number; escalated: number }> {
    const now = Date.now();
    const ESCALATION_THRESHOLD_MS = 60 * 1000; // 60s without safe confirmation
    let escalatedCount = 0;

    const entries = Array.from(this.activeJourneys.entries());
    for (const [journeyId, state] of entries) {
      if (
        state.deviatedAt &&
        now - state.deviatedAt.getTime() >= ESCALATION_THRESHOLD_MS
      ) {
        try {
          const journey = await JourneyRepository.findById(journeyId);
          if (
            journey &&
            journey.status !== "completed" &&
            journey.status !== "cancelled"
          ) {
            const lat = state.lastLocation?.lat ?? Number(journey.origin_lat);
            const lng = state.lastLocation?.lng ?? Number(journey.origin_lng);

            await SosService.triggerSOS({
              userId: journey.user_id,
              journeyId,
              latitude: lat,
              longitude: lng,
              source: "watchdog",
            });

            await JourneyRepository.setEscalatedAt(journeyId, new Date());
            escalatedCount++;
            console.log(
              `[Watchdog] Escalated journey #${journeyId} to SOS after 60s deviation grace window`,
            );
          }
        } catch (err) {
          console.error(
            `[Watchdog] Failed to escalate journey #${journeyId}:`,
            err,
          );
        } finally {
          // Fire once per deviation event
          state.deviatedAt = null;
        }
      }
    }

    return {
      scanned: this.activeJourneys.size,
      escalated: escalatedCount,
    };
  }

  /**
   * Start in-process tick interval (runs every 30s)
   */
  static startTick(intervalMs = 30000): void {
    if (this.tickInterval) return;

    this.tickInterval = setInterval(async () => {
      try {
        await this.scan();
      } catch (err) {
        console.error("[Watchdog] Periodic scan tick error:", err);
      }
    }, intervalMs);

    console.log(
      `[Watchdog] In-process watchdog tick timer started (${intervalMs / 1000}s interval)`,
    );
  }

  static stopTick(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  static getActiveCount(): number {
    return this.activeJourneys.size;
  }
}
