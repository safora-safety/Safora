export interface User {
  id: string;
  name: string;
  email: string;
}

export interface HazardReport {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  category: 'poor_lighting' | 'harassment' | 'isolated_area' | 'other';
  description?: string;
  photoUrl?: string;
  createdAt: string;
}

export interface TrustedContact {
  id: string;
  userId: string;
  name: string;
  phone: string;
}