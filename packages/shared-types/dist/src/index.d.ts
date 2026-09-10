export type UserRole = 'user' | 'admin' | 'moderator';
export interface User {
    id: string | number;
    name: string;
    email: string;
    phone?: string;
    bloodGroup?: string;
    emergencyNotes?: string;
    role?: UserRole;
    createdAt?: string;
}
export type HazardCategory = 'lighting' | 'road_hazard' | 'waterlogging' | 'isolated_area' | 'traffic' | 'other';
export type HazardStatus = 'active' | 'resolved' | 'duplicate' | 'fake';
export interface HazardReport {
    id: string | number;
    userId?: string | number | null;
    reporterName?: string;
    category: HazardCategory;
    title: string;
    description?: string;
    severity: number;
    latitude: number;
    longitude: number;
    photoUrl?: string | null;
    confirmationsCount?: number;
    status: HazardStatus;
    distanceMeters?: number;
    createdAt?: string;
}
export interface TrustedContact {
    id: string | number;
    userId: string | number;
    name: string;
    phone: string;
    relationship?: string;
    createdAt?: string;
}
export type JourneyStatus = 'active' | 'completed' | 'cancelled' | 'deviated';
export interface Coordinates {
    latitude: number;
    longitude: number;
}
export interface Journey {
    id: string | number;
    userId: string | number;
    origin: Coordinates;
    destination: Coordinates;
    plannedRoute?: Coordinates[] | [number, number][];
    trustedContactIds: (string | number)[];
    status: JourneyStatus;
    startedAt?: string;
    expectedArrivalAt?: string;
    endedAt?: string;
}
export type SosAlertStatus = 'dispatched' | 'acknowledged' | 'resolved';
export interface SosAlert {
    id: string | number;
    userId: string | number;
    journeyId?: string | number | null;
    latitude: number;
    longitude: number;
    accuracy?: number;
    batteryPercentage?: number;
    status: SosAlertStatus;
    createdAt?: string;
}
export interface SafetyScoreResponse {
    latitude: number;
    longitude: number;
    safetyScore: number;
    riskLevel: 'safe' | 'moderate' | 'high';
    factors: {
        totalHazardsNearby: number;
        highSeverityCount: number;
        nearestHazardMeters?: number;
    };
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    details?: unknown;
}
