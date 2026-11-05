export const unitTypes = ['Trailer', 'RV', 'Equipment', 'Shed'] as const;
export type UnitType = typeof unitTypes[number];
export const conditions = ['New', 'Used'] as const;
export const hitchTypes = ['Bumper pull', 'Gooseneck', 'Fifth wheel', 'Pintle', 'Not applicable'] as const;
export const numericFields = ['year', 'price', 'width', 'length', 'gvwr', 'payload', 'axles', 'usage'] as const;
export type NumericField = typeof numericFields[number];
export interface Unit {
  id: string; name: string; stock: string; type: UnitType;
  condition: '' | typeof conditions[number]; location: string; hitch: '' | typeof hitchTypes[number];
  year: number | null; price: number | null; width: number | null; length: number | null;
  gvwr: number | null; payload: number | null; axles: number | null; usage: number | null;
  photo: string | null;
  reference?: { length?: number; condition?: 'New' | 'Used' };
}
export type Draft = Omit<Unit, NumericField> & Record<NumericField, string>;
export type Field = keyof Draft;
export type Errors = Partial<Record<Field, string>>;
export type Status = 'ready' | 'incomplete' | 'review';
export interface Issue { field: Field; label: string; detail: string; kind: 'missing' | 'review' }
export const labels: Record<NumericField, string> = { year: 'Model year', price: 'Price', width: 'Width', length: 'Length', gvwr: 'GVWR', payload: 'Payload', axles: 'Axles', usage: 'Usage' };
export const statusLabels: Record<Status, string> = { ready: 'Ready', incomplete: 'Incomplete', review: 'Needs review' };
export const isTowable = (unit: Pick<Unit, 'type' | 'hitch'>) => unit.type === 'Trailer' || (unit.type === 'RV' && unit.hitch !== 'Not applicable');
export const money = (price: number | null) => price === null ? 'Price needed' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(price);
export function toDraft(unit: Unit): Draft {
  const values = Object.fromEntries(numericFields.map(key => [key, unit[key] === null ? '' : String(unit[key])])) as Record<NumericField, string>;
  return { ...unit, ...values };
}
export function fromDraft(draft: Draft): Unit {
  const values = Object.fromEntries(numericFields.map(key => [key, draft[key].trim() === '' ? null : Number(draft[key])])) as Record<NumericField, number | null>;
  return { ...draft, name: draft.name.trim(), stock: draft.stock.trim().toUpperCase(), location: draft.location.trim(), ...values };
}
const ranges: Record<NumericField, [number, number, boolean]> = {
  year: [1980, 2028, true], price: [0.01, 10000000, false], width: [0.1, 30, false], length: [0.1, 100, false],
  gvwr: [1, 200000, false], payload: [0, 200000, false], axles: [1, 8, true], usage: [0, 1000000, true],
};
export function validateDraft(draft: Draft, units: Unit[]): Errors {
  const errors: Errors = {};
  if (!draft.name.trim()) errors.name = 'Enter a descriptive unit name.';
  else if (draft.name.trim().length > 100) errors.name = 'Use 100 characters or fewer.';
  if (!/^[A-Za-z0-9-]{2,20}$/.test(draft.stock.trim())) errors.stock = 'Use 2–20 letters, numbers, or hyphens.';
  else if (units.some(unit => unit.id !== draft.id && unit.stock.toLowerCase() === draft.stock.trim().toLowerCase())) errors.stock = 'This stock number is already in use.';
  if (!unitTypes.includes(draft.type)) errors.type = 'Choose a unit type.';
  if (draft.type === 'Trailer' && draft.hitch === 'Not applicable') errors.hitch = 'Choose a towing hitch for a trailer.';
  if (draft.location.length > 80) errors.location = 'Use 80 characters or fewer.';
  for (const key of numericFields) {
    if (!draft[key].trim()) continue; // A draft may be incomplete; nonempty values must be valid.
    const value = Number(draft[key]); const [min, max, integer] = ranges[key];
    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value)))
      errors[key] = `Enter ${integer ? 'a whole number' : 'a number'} from ${min.toLocaleString()} to ${max.toLocaleString()}.`;
  }
  if (draft.price && Number.isFinite(Number(draft.price)) && Math.abs(Number(draft.price) * 100 - Math.round(Number(draft.price) * 100)) > 0.00001) errors.price = 'Use no more than two decimal places.';
  if (draft.gvwr && draft.payload && Number(draft.payload) > Number(draft.gvwr)) errors.payload = 'Payload cannot be greater than GVWR.';
  return errors;
}
export function updateDraft(draft: Draft, field: Field, value: string | null): Draft {
  const next = { ...draft, [field]: value } as Draft;
  if (field === 'type') {
    if (next.type === 'Equipment' || next.type === 'Shed') next.hitch = 'Not applicable';
    else if (next.type === 'Trailer' && next.hitch === 'Not applicable') next.hitch = '';
    if (next.type !== 'Equipment' && !(next.type === 'RV' && next.hitch === 'Not applicable')) next.usage = '';
  }
  if (field === 'type' || field === 'hitch') {
    if (!isTowable(next)) { next.gvwr = ''; next.payload = ''; next.axles = ''; }
    if (isTowable(next)) next.usage = '';
  }
  return next;
}
export function inspectUnit(unit: Unit): { status: Status; issues: Issue[] } {
  const issues: Issue[] = [];
  const requireNumber = (field: NumericField) => {
    if (unit[field] === null) issues.push({ field, label: `Missing ${labels[field].toLowerCase()}`, detail: `Add ${labels[field].toLowerCase()} to complete this listing.`, kind: 'missing' });
  };
  (['price', 'year', 'width', 'length'] as NumericField[]).forEach(requireNumber);
  if (isTowable(unit)) (['gvwr', 'payload', 'axles'] as NumericField[]).forEach(requireNumber);
  if ((unit.type === 'Trailer' || unit.type === 'RV') && !unit.hitch) issues.push({ field: 'hitch', label: 'Missing hitch type', detail: 'Choose a hitch type, or Not applicable for a motorized RV.', kind: 'missing' });
  if (!unit.condition) issues.push({ field: 'condition', label: 'Missing condition', detail: 'Choose New or Used.', kind: 'missing' });
  if (!unit.location.trim()) issues.push({ field: 'location', label: 'Missing location', detail: 'Add the lot location.', kind: 'missing' });
  if (unit.type === 'Equipment' || (unit.type === 'RV' && unit.hitch === 'Not applicable')) requireNumber('usage');
  if (!unit.photo) issues.push({ field: 'photo', label: 'No photo', detail: 'Add an image. This demo includes clearly labeled sample illustrations.', kind: 'missing' });
  if (unit.reference?.length !== undefined && unit.length !== null && unit.length !== unit.reference.length)
    issues.push({ field: 'length', label: 'Length mismatch', detail: `The fictional intake record lists ${unit.reference.length} ft. Check the listed length against it.`, kind: 'review' });
  if (unit.reference?.condition && unit.condition && unit.condition !== unit.reference.condition)
    issues.push({ field: 'condition', label: 'Condition mismatch', detail: `The fictional intake record lists ${unit.reference.condition.toLowerCase()} condition. Check the listing against it.`, kind: 'review' });
  return { status: issues.some(issue => issue.kind === 'missing') ? 'incomplete' : issues.length ? 'review' : 'ready', issues };
}
export function summarize(units: Unit[]) {
  const counts = { total: units.length, ready: 0, incomplete: 0, review: 0, attention: 0 };
  units.forEach(unit => counts[inspectUnit(unit).status]++);
  counts.attention = counts.incomplete + counts.review;
  return counts;
}
export function filterUnits(units: Unit[], { search = '', type = 'all', status = 'all' }: { search?: string; type?: string; status?: string }) {
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return units.filter(unit => {
    const state = inspectUnit(unit).status;
    return (type === 'all' || unit.type === type) && (status === 'all' || (status === 'attention' ? state !== 'ready' : state === status)) &&
      terms.every(term => `${unit.name} ${unit.stock}`.toLowerCase().includes(term));
  });
}
export function emptyUnit(id: string): Unit {
  return { id, name: '', stock: '', type: 'Trailer', condition: '', location: 'Main lot', hitch: '', year: null, price: null, width: null, length: null, gvwr: null, payload: null, axles: null, usage: null, photo: null };
}

