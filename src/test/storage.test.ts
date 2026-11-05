import { describe, expect, it } from 'vitest';
import { createSeed } from '../seed';
import { readUnits, STORAGE_KEY, validUnits, writeUnits, type StoragePort } from '../storage';
function memory(initial: string | null = null): StoragePort { let value = initial; return { getItem:() => value, setItem:(_, next) => { value = next; } }; }
describe('browser-local persistence', () => {
  it('loads initial records when storage is missing and preserves intentional empty inventory', () => {
    expect(readUnits(memory()).units).toHaveLength(128);
    const storage = memory(); writeUnits(storage, []); expect(readUnits(storage).units).toEqual([]);
  });
  it('persists edits, then restores the original seed on reset', () => {
    const storage = memory(); const units = createSeed(); units[0].price=7900; writeUnits(storage, units);
    expect(readUnits(storage).units[0].price).toBe(7900);
    writeUnits(storage, createSeed()); expect(readUnits(storage).units[0].price).toBeNull();
  });
  it.each(['not json', '{"version":2,"units":[]}', '{"version":1,"units":[{}]}'])('recovers invalid saved data without overwriting it: %s', raw => {
    const storage=memory(raw); const loaded=readUnits(storage); expect(loaded.units).toHaveLength(128); expect(loaded.notice).toContain('could not be read'); expect(storage.getItem(STORAGE_KEY)).toBe(raw);
  });
  it('rejects duplicate identifiers, unsafe asset URLs and incompatible hitch values', () => {
    const units=createSeed(); expect(validUnits([units[0], units[0]])).toBe(false);
    expect(validUnits([{ ...units[0], photo:'https://untrusted.example/x.svg' }])).toBe(false);
    expect(validUnits([{ ...units[0], hitch:'Not applicable' }])).toBe(false);
  });
  it('surfaces failed writes and prevents stale tabs from overwriting newer changes', () => {
    const blocked: StoragePort = { getItem:() => null, setItem:() => { throw new Error('quota'); } };
    expect(() => writeUnits(blocked, createSeed())).toThrow('Could not save');
    const storage=memory(); writeUnits(storage, createSeed());
    expect(() => writeUnits(storage, createSeed(), null)).toThrow('another tab');
  });
  it('rejects too many records before writing so successful saves remain reloadable', () => {
    const units=Array.from({length:1001}, (_,i) => ({ ...createSeed()[0], id:'unit-'+i, stock:'TEST-'+i }));
    const storage=memory(); expect(() => writeUnits(storage,units)).toThrow('1,000');
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });
});

