// api/fixtures.ts — fixture loader
import type { SKUBubble } from '../types/api';

export async function loadInventoryMarginFixture(): Promise<SKUBubble[]> {
  // In Vite we can fetch public files or use hardcoded fixture data
  // This uses the fixtures/ folder at root (accessed via API in real mode)
  const res = await fetch('/fixtures/inventory_margin.json');
  if (!res.ok) {
    throw new Error(`Failed to load fixture: ${res.statusText}`);
  }
  const json = await res.json();
  return json.skus as SKUBubble[];
}
