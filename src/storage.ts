import { conditions, hitchTypes, numericFields, unitTypes, validateDraft, toDraft, type Unit } from './model';
import { createSeed } from './seed';
export const STORAGE_KEY = 'unitflow-demo-v1';
const allowedPhotos = ['/images/trailer.svg','/images/rv.svg','/images/equipment.svg','/images/shed.svg'];
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function validUnits(value: unknown): value is Unit[] {
  if (!Array.isArray(value) || value.length > 1000) return false;
  const ids = new Set<string>();
  const stocks = new Set<string>();
  return value.every((u: Unit) => {
    if (!u || typeof u !== 'object' || typeof u.id !== 'string' || !/^[a-z0-9-]{1,80}$/i.test(u.id) || ids.has(u.id)) return false;
    ids.add(u.id);
    if (typeof u.stock !== 'string' || stocks.has(u.stock.toLowerCase())) return false;
    stocks.add(u.stock.toLowerCase());
    if (!unitTypes.includes(u.type) || typeof u.name !== 'string' || typeof u.location !== 'string' || !['', ...conditions].includes(u.condition) || !['', ...hitchTypes].includes(u.hitch)) return false;
    if (!numericFields.every(key => u[key] === null || (typeof u[key] === 'number' && Number.isFinite(u[key])))) return false;
    if (!(u.photo === null || allowedPhotos.includes(u.photo))) return false;
    if (u.reference !== undefined && (!u.reference || typeof u.reference !== 'object' ||
      (u.reference.length !== undefined && (typeof u.reference.length !== 'number' || u.reference.length <= 0 || u.reference.length > 100)) ||
      (u.reference.condition !== undefined && !conditions.includes(u.reference.condition)))) return false;
    return Object.keys(validateDraft(toDraft(u), [])).length === 0;
  });
}
export function readUnits(storage: StoragePort): { units: Unit[]; notice: string; snapshot: string | null } {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { units: createSeed(), notice: '', snapshot: raw };
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !validUnits(parsed.units)) throw new Error('Invalid saved data');
    return { units: parsed.units, notice: '', snapshot: raw };
  } catch {
    return { units: createSeed(), notice: 'Saved data could not be read. Sample inventory is shown. Reset demo data to start a new saved copy.', snapshot: null };
  }
}
export function writeUnits(storage: StoragePort, units: Unit[], expected?: string | null): string {
  if (units.length > 1000) throw new Error('The demo supports up to 1,000 units. Reset demo data before adding more.');
  if (!validUnits(units)) throw new Error('The inventory contains an invalid record. Check your changes before saving.');
  if (expected !== undefined && storage.getItem(STORAGE_KEY) !== expected) throw new Error('Inventory changed in another tab. Refresh this page before saving. Your edits are still here.');
  const snapshot = JSON.stringify({ version: 1, units });
  try { storage.setItem(STORAGE_KEY, snapshot); } catch { throw new Error('Could not save in this browser. Your edits are still here. Check browser storage permissions or free space, then try again.'); }
  return snapshot;
}

