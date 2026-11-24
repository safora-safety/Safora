export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: "CRASH" | "ERROR" | "WARN" | "INFO";
  source: string;
  message: string;
  stack?: string;
  metadata?: Record<string, any>;
}

export class SystemLogService {
  private static readonly MAX_LOGS = 200;
  private static logs: SystemLogEntry[] = [];

  static recordLog(
    level: "CRASH" | "ERROR" | "WARN" | "INFO",
    source: string,
    message: string,
    stack?: string,
    metadata?: Record<string, any>,
  ): SystemLogEntry {
    const entry: SystemLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      source,
      message: message || "Unknown event",
      stack: stack || undefined,
      metadata: metadata || undefined,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.pop();
    }

    return entry;
  }

  static getLogs(level?: string): SystemLogEntry[] {
    if (level && level !== "ALL") {
      return this.logs.filter((l) => l.level === level.toUpperCase());
    }
    return [...this.logs];
  }

  static getCrashCount(): number {
    return this.logs.filter((l) => l.level === "CRASH" || l.level === "ERROR")
      .length;
  }

  static clearLogs(): void {
    this.logs = [];
    this.recordLog("INFO", "system", "Log buffer cleared by operator");
  }
}

// Initial bootstrap entry
SystemLogService.recordLog(
  "INFO",
  "system",
  "SAFORA Safety CAD Engine logging initialized",
);
