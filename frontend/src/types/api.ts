// types/api.ts — shared API types

export type Quadrant = 'scale' | 'protect' | 'pause' | 'fix';
export type Provenance = 'measured' | 'derived' | 'scenario';

export interface SKUBubble {
  sku: string;
  name: string;
  category: string;
  margin_pct: number;      // 0–100
  days_of_cover: number;
  spend: number;
  revenue: number;
  quadrant: Quadrant;
  opportunity_score: number; // 0–100
  provenance: Provenance;
}
