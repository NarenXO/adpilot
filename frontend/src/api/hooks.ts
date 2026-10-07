// api/hooks.ts — TanStack Query hooks
import { useQuery } from '@tanstack/react-query';
import type { SKUBubble } from '../types/api';

// Inline fixture data so it works without a backend server
const FIXTURE_DATA: SKUBubble[] = [
  { sku:'SKU-001', name:'Premium Moisturizer', category:'Skincare', margin_pct:62.0, days_of_cover:4.2, spend:500, revenue:2100, quadrant:'fix', opportunity_score:32, provenance:'scenario' },
  { sku:'SKU-002', name:'Vitamin C Serum', category:'Skincare', margin_pct:74.0, days_of_cover:24.0, spend:300, revenue:2900, quadrant:'scale', opportunity_score:87, provenance:'measured' },
  { sku:'SKU-003', name:'Retinol Night Cream', category:'Skincare', margin_pct:55.0, days_of_cover:18.0, spend:420, revenue:1800, quadrant:'scale', opportunity_score:71, provenance:'measured' },
  { sku:'SKU-004', name:'Hyaluronic Acid', category:'Skincare', margin_pct:68.0, days_of_cover:5.5, spend:600, revenue:3200, quadrant:'protect', opportunity_score:64, provenance:'measured' },
  { sku:'SKU-005', name:'SPF 50 Sunscreen', category:'Skincare', margin_pct:45.0, days_of_cover:30.0, spend:220, revenue:900, quadrant:'scale', opportunity_score:55, provenance:'derived' },
  { sku:'SKU-006', name:'Acne Spot Treatment', category:'Treatment', margin_pct:15.0, days_of_cover:12.0, spend:800, revenue:950, quadrant:'pause', opportunity_score:12, provenance:'measured' },
  { sku:'SKU-007', name:'Hair Growth Serum', category:'Haircare', margin_pct:58.0, days_of_cover:3.0, spend:350, revenue:2200, quadrant:'fix', opportunity_score:41, provenance:'scenario' },
  { sku:'SKU-008', name:'Collagen Gummies', category:'Supplements', margin_pct:72.0, days_of_cover:20.0, spend:900, revenue:5100, quadrant:'scale', opportunity_score:91, provenance:'measured' },
  { sku:'SKU-009', name:'Eye Cream', category:'Skincare', margin_pct:66.0, days_of_cover:8.0, spend:280, revenue:1400, quadrant:'scale', opportunity_score:68, provenance:'derived' },
  { sku:'SKU-010', name:'Charcoal Mask', category:'Skincare', margin_pct:12.0, days_of_cover:22.0, spend:700, revenue:760, quadrant:'pause', opportunity_score:8, provenance:'measured' },
  { sku:'SKU-011', name:'Argan Oil', category:'Haircare', margin_pct:59.0, days_of_cover:6.0, spend:190, revenue:1100, quadrant:'protect', opportunity_score:57, provenance:'measured' },
  { sku:'SKU-012', name:'Lip Plumper', category:'Makeup', margin_pct:48.0, days_of_cover:14.5, spend:310, revenue:1300, quadrant:'scale', opportunity_score:49, provenance:'derived' },
  { sku:'SKU-013', name:'Brightening Toner', category:'Skincare', margin_pct:53.0, days_of_cover:2.0, spend:460, revenue:1950, quadrant:'fix', opportunity_score:36, provenance:'measured' },
  { sku:'SKU-014', name:'Beard Oil', category:'Mens', margin_pct:61.0, days_of_cover:35.0, spend:150, revenue:800, quadrant:'scale', opportunity_score:62, provenance:'scenario' },
  { sku:'SKU-015', name:'Body Butter', category:'Bodycare', margin_pct:18.0, days_of_cover:16.0, spend:550, revenue:610, quadrant:'pause', opportunity_score:14, provenance:'measured' },
  { sku:'SKU-016', name:'Keratin Treatment', category:'Haircare', margin_pct:70.0, days_of_cover:9.0, spend:420, revenue:3600, quadrant:'scale', opportunity_score:79, provenance:'measured' },
  { sku:'SKU-017', name:'Peptide Complex', category:'Skincare', margin_pct:76.0, days_of_cover:4.0, spend:750, revenue:4800, quadrant:'fix', opportunity_score:73, provenance:'measured' },
  { sku:'SKU-018', name:'Natural Deodorant', category:'Bodycare', margin_pct:38.0, days_of_cover:25.0, spend:200, revenue:740, quadrant:'scale', opportunity_score:40, provenance:'derived' },
  { sku:'SKU-019', name:'Caffeine Eye Gel', category:'Skincare', margin_pct:64.0, days_of_cover:7.0, spend:380, revenue:2300, quadrant:'protect', opportunity_score:67, provenance:'measured' },
  { sku:'SKU-020', name:'Tea Tree Oil', category:'Treatment', margin_pct:41.0, days_of_cover:19.0, spend:170, revenue:620, quadrant:'scale', opportunity_score:43, provenance:'derived' },
];

export function useInventoryMargin() {
  return useQuery<SKUBubble[]>({
    queryKey: ['inventory-margin'],
    queryFn: async () => {
      // Try the live API first, fall back to inline fixture data
      try {
        const res = await fetch('http://localhost:8000/api/inventory/bubbles', {
          signal: AbortSignal.timeout(2000),
        });
        if (res.ok) {
          const json = await res.json();
          return json as SKUBubble[];
        }
      } catch {
        // backend not running → use fixture
      }
      return FIXTURE_DATA;
    },
    staleTime: 30_000,
  });
}
