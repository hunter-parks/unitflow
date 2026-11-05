import { describe, expect, it } from 'vitest';
import { emptyUnit, filterUnits, fromDraft, inspectUnit, summarize, toDraft, updateDraft, validateDraft } from '../model';
import { createSeed } from '../seed';
describe('inventory rules', () => {
  it('derives all starting totals from 128 distinct fictional records', () => {
    const units = createSeed(); expect(new Set(units.map(u => u.id)).size).toBe(128);
    expect(summarize(units)).toEqual({ total:128, ready:106, incomplete:14, review:8, attention:22 });
  });
  it('resolves a missing price and updates both readiness and the attention filter', () => {
    const units = createSeed(); const draft = toDraft(units[0]); draft.price = '6995';
    const updated = fromDraft(draft); expect(validateDraft(draft, units)).toEqual({});
    const next = units.map(u => u.id === updated.id ? updated : u);
    expect(summarize(next)).toMatchObject({ ready:107, incomplete:13, attention:21 });
    expect(filterUnits(next, { status:'attention' }).find(u => u.id === updated.id)).toBeUndefined();
    expect(units[0].price).toBeNull();
  });
  it('combines search terms, type, and status instead of replacing filters', () => {
    const units = createSeed();
    expect(filterUnits(units, { search:'TR-1042 utility', type:'Trailer', status:'attention' }).map(u => u.id)).toEqual(['tr-1042']);
    expect(filterUnits(units, { search:'TR-1042', type:'RV', status:'attention' })).toEqual([]);
    expect(filterUnits(units, { search:'unknown' })).toEqual([]);
  });
  it('uses intake values to resolve inconsistent length and condition', () => {
    const units = createSeed();
    expect(inspectUnit({ ...units[1], length:28 }).status).toBe('ready');
    expect(inspectUnit({ ...units[3], condition:'Used' }).status).toBe('ready');
  });
  it('allows incomplete drafts but rejects invalid nonempty values and duplicate stocks', () => {
    const draft = toDraft(emptyUnit('new')); draft.name='Demo trailer'; draft.stock='TEST-1';
    expect(validateDraft(draft, createSeed())).toEqual({});
    expect(inspectUnit(fromDraft(draft)).status).toBe('incomplete');
    draft.price='-1'; draft.year='2035'; draft.axles='1.5'; draft.stock='tr-1042';
    expect(Object.keys(validateDraft(draft, createSeed()))).toEqual(expect.arrayContaining(['price','year','axles','stock']));
  });
  it('rejects nonfinite values, overprecise currency and payload above GVWR', () => {
    const d = toDraft(createSeed()[0]); d.price='1.001'; d.width='Infinity'; d.payload='15000'; d.gvwr='14000';
    expect(validateDraft(d, [])).toMatchObject({ price:expect.any(String), width:expect.any(String), payload:expect.any(String) });
  });
  it('normalizes hidden towing fields and incompatible hitch on type changes', () => {
    const d = toDraft(createSeed()[5]);
    const trailer = updateDraft(d, 'type','Trailer'); expect(trailer.hitch).toBe(''); expect(trailer.usage).toBe('');
    const equipment = updateDraft({ ...trailer, payload:'-1' }, 'type','Equipment');
    expect(equipment.payload).toBe(''); expect(validateDraft(equipment, [])).toEqual({});
    expect(validateDraft({ ...trailer, hitch:'Not applicable' }, [])).toHaveProperty('hitch');
  });
  it('does not require towing fields for sheds or motorized RVs', () => {
    expect(inspectUnit(createSeed()[5]).status).toBe('ready');
    const shed = { ...createSeed()[2], photo:'/images/shed.svg' }; expect(inspectUnit(shed).status).toBe('ready');
  });
});

