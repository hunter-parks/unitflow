import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useBlocker, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { emptyUnit, filterUnits, fromDraft, hitchTypes, inspectUnit, isTowable, labels, money, statusLabels, summarize, toDraft, unitTypes, updateDraft, validateDraft, type Draft, type Errors, type Field, type NumericField, type Status, type Unit } from './model';
import { createSeed } from './seed';
import { readUnits, writeUnits } from './storage';

type InventoryContext = { units: Unit[]; save: (unit: Unit) => void; notify: (message: string) => void; reset: () => void };
const InventoryData = createContext<InventoryContext | null>(null);
const useInventory = () => { const value = useContext(InventoryData); if (!value) throw new Error('Inventory provider is missing.'); return value; };
function Icon({ name, size = 20 }: { name: 'grid' | 'box' | 'alert' | 'arrow' | 'search' | 'check' | 'plus' | 'back'; size?: number }) {
  const paths = { grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>, box: <><path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z"/><path d="m3 7 9 4 9-4M12 11v10M8 5l9 4"/></>, alert: <><path d="m12 3 10 17H2L12 3Z"/><path d="M12 9v4M12 16v1"/></>, arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>, search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>, check: <path d="m5 12 4 4L19 6"/>, plus: <path d="M12 5v14M5 12h14"/>, back: <path d="M19 12H5m5-5-5 5 5 5"/> };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function Badge({ status }: { status: Status }) { return <span className={'badge ' + status}><span aria-hidden="true" className="status-dot"/>{statusLabels[status]}</span>; }
function Dialog({ title, children, confirm, confirmLabel, onClose }: { title: string; children: ReactNode; confirm: () => void; confirmLabel: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; ref.current?.showModal(); return () => { ref.current?.close(); previous?.focus(); }; }, []);
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2 id="dialog-title">{title}</h2><div className="dialog-copy">{children}</div>
    <div className="actions"><button type="button" autoFocus onClick={onClose}>{confirmLabel === 'Discard changes' ? 'Keep editing' : 'Cancel'}</button><button className="primary" type="button" onClick={confirm}>{confirmLabel}</button></div>
  </dialog>;
}
export function App() {
  const [loaded] = useState(() => { try { return readUnits(window.localStorage); } catch { return { units: createSeed(), snapshot: null, notice: 'Browser storage is unavailable. You can explore sample inventory, but saving needs browser storage.' }; } });
  const [units, setUnits] = useState(loaded.units);
  const [notice, setNotice] = useState(loaded.notice);
  const [message, setMessage] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetError, setResetError] = useState('');
  const snapshot = useRef(loaded.snapshot);
  const location = useLocation();
  const counts = summarize(units);
  useEffect(() => { const listener = () => setNotice('Inventory may have changed in another tab. Refresh this page before editing.'); window.addEventListener('storage', listener); return () => window.removeEventListener('storage', listener); }, []);
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(''), 8000); return () => clearTimeout(timer); }, [message]);
  useEffect(() => {
    document.title = (location.pathname === '/' ? 'Dashboard' : location.pathname === '/inventory' ? 'Inventory' : location.pathname === '/units/new' ? 'Add unit' : 'Unit details') + ' · UnitFlow';
    window.scrollTo({ top: 0 });
    document.getElementById('page-title')?.focus({ preventScroll: true });
  }, [location.pathname]);
  const save = (unit: Unit) => {
    if (loaded.notice && notice === loaded.notice) throw new Error('Reset demo data before saving to replace unreadable stored data.');
    const next = units.some(item => item.id === unit.id) ? units.map(item => item.id === unit.id ? unit : item) : [unit, ...units];
    snapshot.current = writeUnits(window.localStorage, next, snapshot.current);
    setUnits(next);
  };
  const reset = () => {
    try { const next = createSeed(); snapshot.current = writeUnits(window.localStorage, next); setUnits(next); setNotice(''); setResetOpen(false); setResetError(''); setMessage('Demo data reset. The original 128 sample units are restored.'); }
    catch (error) { setResetError((error as Error).message); }
  };
  return <InventoryData.Provider value={{ units, save, notify: setMessage, reset: () => setResetOpen(true) }}>
    <a href="#main" className="skip-link">Skip to content</a>
    <aside className="sidebar">
      <Link to="/" className="brand" aria-label="UnitFlow dashboard"><span className="brand-mark">U</span><span>UnitFlow</span></Link>
      <nav aria-label="Main navigation">
        <NavLink to="/" end><Icon name="grid"/>Dashboard</NavLink>
        <NavLink to="/inventory" className={({ isActive }) => isActive && !location.search.includes('status=attention') ? 'active' : ''}><Icon name="box"/>Inventory</NavLink>
        <Link to="/inventory?status=attention" className={location.pathname === '/inventory' && location.search.includes('status=attention') ? 'active' : ''}><Icon name="alert"/>Needs attention<span className="nav-count">{counts.attention}</span></Link>
      </nav>
      <div className="workspace"><span className="workspace-avatar">NM</span><div><strong>Northline Motors</strong><span>Demo workspace</span></div></div>
    </aside>
    <div className="app-content">
      <div className="demo-notice"><span className="demo-label">Portfolio demo</span><span>Fictional inventory. Changes stay in this browser.</span></div>
      <main id="main" tabIndex={-1}>
        {notice && <div className="notice warning" role="alert">{notice}</div>}
        <Outlet/>
        <footer><span>Northline Motors · Fictional sample data</span><span>Ready means ready to list, not published.</span></footer>
      </main>
    </div>
    <div className={'toast ' + (message ? 'visible' : '')} role="status" aria-live="polite">{message && <><Icon name="check"/><span>{message}</span><button aria-label="Dismiss notification" onClick={() => setMessage('')}>×</button></>}</div>
    {resetOpen && <Dialog title="Reset demo data?" confirmLabel="Reset demo data" onClose={() => { setResetOpen(false); setResetError(''); }} confirm={reset}><p>This replaces your saved edits and added units with the original 128 fictional records in this browser.</p>{resetError && <p role="alert" className="error">{resetError}</p>}</Dialog>}
  </InventoryData.Provider>;
}
function Header({ title, description, action = true }: { title: string; description: string; action?: boolean }) {
  return <header className="page-header"><div><h1 id="page-title" tabIndex={-1}>{title}</h1><p>{description}</p></div>{action && <Link className="button primary" to="/units/new"><Icon name="plus" size={18}/>Add unit</Link>}</header>;
}
function Empty({ title, children, action }: { title: string; children: ReactNode; action: ReactNode }) {
  return <div className="empty"><div className="empty-icon"><Icon name="box" size={26}/></div><h2>{title}</h2><p>{children}</p>{action}</div>;
}
function UnitRows({ units, attention = false, returnTo = '/inventory' }: { units: Unit[]; attention?: boolean; returnTo?: string }) {
  return <>
    <div className="table-wrap"><table><caption className="sr-only">{attention ? 'Units needing attention' : 'Inventory results'}</caption><thead><tr><th scope="col">Unit</th><th scope="col">Stock #</th><th scope="col">{attention ? 'Issue' : 'Price / issue'}</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
      <tbody>{units.map(unit => { const { status, issues } = inspectUnit(unit); return <tr key={unit.id}>
        <th scope="row"><Link className="unit-link" state={{ returnTo }} to={'/units/' + unit.id}>{unit.name}</Link><span className="unit-meta">{unit.type} · {unit.condition || 'Condition needed'}</span></th>
        <td className="stock">{unit.stock}</td><td><span>{attention ? issues[0]?.label ?? 'No issues' : money(unit.price)}</span>{!attention && issues.length > 0 && <span className="unit-meta issue">{issues[0].label}{issues.length > 1 ? ' +' + (issues.length - 1) : ''}</span>}</td>
        <td><Badge status={status}/></td><td className="row-action"><Link className="button" state={{ returnTo }} to={'/units/' + unit.id} aria-label={(status === 'ready' ? 'View ' : 'Review ') + unit.stock}>{status === 'ready' ? 'View' : 'Review'}<Icon name="arrow" size={16}/></Link></td>
      </tr>; })}</tbody></table></div>
    <div className="unit-cards">{units.map(unit => { const { status, issues } = inspectUnit(unit); return <article className="unit-card" key={unit.id}>
      <div className="split"><span className="eyebrow">{unit.stock} · {unit.type}</span><Badge status={status}/></div>
      <h3><Link state={{ returnTo }} to={'/units/' + unit.id}>{unit.name}</Link></h3>
      <p>{attention ? issues[0]?.label ?? 'No issues' : money(unit.price)}</p>
      {!attention && issues.length > 0 && <p className="issue">{issues[0].label}{issues.length > 1 ? ' · ' + issues.length + ' issues' : ''}</p>}
      <Link className="button mobile-row-action" state={{ returnTo }} to={'/units/' + unit.id} aria-label={(status === 'ready' ? 'View ' : 'Review ') + unit.stock}>{status === 'ready' ? 'View unit' : 'Review unit'}<Icon name="arrow" size={16}/></Link>
    </article>; })}</div>
  </>;
}
export function Dashboard() {
  const { units, reset } = useInventory(); const counts = summarize(units);
  const [tab, setTab] = useState('attention');
  const list = filterUnits(units, { status: tab });
  const pct = counts.total ? Math.round(counts.ready / counts.total * 100) : 0;
  return <>
    <Header title="Dashboard" description="See what is ready and what needs a closer look."/>
    <section className="metrics" aria-label="Inventory summary">
      <Link className="metric" to="/inventory"><div className="split"><span>Total units</span><Icon name="box"/></div><strong>{counts.total}</strong><p>Across all unit types</p></Link>
      <Link className="metric" to="/inventory?status=attention"><div className="split"><span>Needs attention</span><Icon name="alert"/></div><strong>{counts.attention}</strong><p>{counts.incomplete} incomplete · {counts.review} need review</p></Link>
      <Link className="metric" to="/inventory?status=ready"><div className="split"><span>Ready to list</span><Icon name="check"/></div><strong>{counts.ready}</strong><p>Required information and checks complete</p></Link>
    </section>
    <section className="panel readiness" aria-labelledby="readiness-title"><div className="readiness-copy"><h2 id="readiness-title">Inventory readiness</h2><p>{counts.ready} of {counts.total} units are ready to list.</p></div><div className="readiness-bar"><div className="split"><span>Ready to list</span><strong>{pct}%</strong></div><progress value={pct} max="100" aria-label="Inventory ready to list">{pct}%</progress><div className="readiness-links"><Link to="/inventory?status=incomplete">{counts.incomplete} missing info</Link><span aria-hidden="true">·</span><Link to="/inventory?status=review">{counts.review} need review</Link></div></div></section>
    <section className="panel attention-panel" aria-labelledby="attention-title"><div className="section-header"><div><h2 id="attention-title">Needs attention</h2><p>Start with a listing issue and make the next fix.</p></div><Link className="button" to="/inventory?status=attention">View all {counts.attention}<Icon name="arrow" size={16}/></Link></div>
      <div className="chips" role="group" aria-label="Attention type">{[['attention', 'All', counts.attention], ['incomplete', 'Missing info', counts.incomplete], ['review', 'Inconsistent', counts.review]].map(([key, label, count]) => <button key={key} className={'chip ' + (tab === key ? 'selected' : '')} aria-pressed={tab === key} onClick={() => setTab(String(key))}>{label}<span>{count}</span></button>)}</div>
      {list.length ? <><UnitRows units={list.slice(0, 4)} attention returnTo="/"/><div className="table-footer">Showing {Math.min(4, list.length)} of {list.length} units needing attention</div></> : <Empty title="No units need attention" action={<Link className="button" to="/inventory">View inventory</Link>}>The listings in this view have the required information and pass the current checks.</Empty>}
    </section>
    <div className="reset-row"><p>Explore freely. You can restore the sample inventory at any time.</p><button onClick={reset}>Reset demo data</button></div>
  </>;
}
export function Inventory() {
  const { units } = useInventory(); const [params, setParams] = useSearchParams(); const [page, setPage] = useState(1);
  const search = params.get('q') || ''; const type = unitTypes.includes(params.get('type') as Unit['type']) ? params.get('type')! : 'all';
  const status = ['ready','incomplete','review','attention'].includes(params.get('status') || '') ? params.get('status')! : 'all';
  const results = filterUnits(units, { search, type, status }); const count = Math.ceil(results.length / 12); const current = Math.min(page, count || 1);
  const location = useLocation(); const returnTo = location.pathname + location.search;
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); value === 'all' || !value ? next.delete(key) : next.set(key, value); setParams(next, { replace: true }); setPage(1); };
  const resetFilters = () => { setParams({}); setPage(1); };
  return <>
    <Header title={status === 'attention' ? 'Needs attention' : 'Inventory'} description={status === 'attention' ? 'Choose the next listing issue to fix.' : 'Find a unit by name, stock number, type, or status.'}/>
    <section className="panel inventory-panel" aria-label="Inventory">
      <div className="filter-bar">
        <label className="search-field"><span>Search inventory</span><div><Icon name="search" size={18}/><input type="search" placeholder="Name or stock #" value={search} onChange={event => update('q', event.target.value)}/></div></label>
        <label>Unit type<select value={type} onChange={event => update('type', event.target.value)}><option value="all">All types</option>{unitTypes.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Listing status<select value={status} onChange={event => update('status', event.target.value)}><option value="all">All statuses</option><option value="attention">Needs attention</option><option value="incomplete">Incomplete</option><option value="review">Needs review</option><option value="ready">Ready</option></select></label>
        <button className="reset-filter" onClick={resetFilters} disabled={!search && type === 'all' && status === 'all'}>Reset filters</button>
      </div>
      <div className="results-heading"><strong aria-live="polite">{results.length} {results.length === 1 ? 'unit' : 'units'}</strong><span>Readiness is based on saved listing information.</span></div>
      {results.length ? <><UnitRows units={results.slice((current - 1) * 12, current * 12)} returnTo={returnTo}/><div className="pagination"><span>Showing {(current - 1) * 12 + 1}–{Math.min(current * 12, results.length)} of {results.length}</span><div className="actions"><button disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</button><span aria-live="polite">Page {current} of {count}</span><button disabled={current === count} onClick={() => setPage(current + 1)}>Next</button></div></div></>
      : <Empty title={units.length ? 'No matching units' : 'Your inventory is empty'} action={units.length ? <button onClick={resetFilters}>Reset filters</button> : <Link className="button primary" to="/units/new">Add unit</Link>}>{units.length ? 'Try another name or stock number, or clear your filters.' : 'Add your first fictional unit to get started.'}</Empty>}
    </section>
  </>;
}
function NumberField({ name, draft, set, errors, hint }: { name: NumericField; draft: Draft; set: (name: Field, value: string) => void; errors: Errors; hint?: string }) {
  const suffix = name === 'price' ? 'USD' : name === 'width' || name === 'length' ? 'ft' : name === 'gvwr' || name === 'payload' ? 'lb' : name === 'usage' ? (draft.type === 'Equipment' ? 'hours' : 'miles') : '';
  return <label className="field" htmlFor={name}><span id={name + '-label'}>{labels[name]}{suffix && ' (' + suffix + ')'}</span>
    <input id={name} aria-labelledby={name + '-label'} name={name} type="number" inputMode={['year','axles','usage'].includes(name) ? 'numeric' : 'decimal'} step={['year','axles','usage'].includes(name) ? '1' : '0.01'} value={draft[name]} onChange={event => set(name, event.target.value)} aria-invalid={!!errors[name]} aria-describedby={(errors[name] || hint) ? name + '-hint' : undefined} placeholder={name === 'price' ? 'Enter price' : 'Not entered'}/>
    {(errors[name] || hint) && <span id={name + '-hint'} className={errors[name] ? 'field-error' : 'helper'}>{errors[name] || hint}</span>}
  </label>;
}
export function UnitPage() {
  const { id } = useParams(); const { units } = useInventory();
  const [newId] = useState(() => 'unit-' + crypto.randomUUID());
  const isNew = !id; const unit = isNew ? emptyUnit(newId) : units.find(item => item.id === id);
  if (!unit) return <NotFound/>;
  return <UnitEditor key={id || 'new'} initial={unit} isNew={isNew}/>;
}
export function UnitEditor({ initial, isNew }: { initial: Unit; isNew: boolean }) {
  const { units, save, notify } = useInventory(); const navigate = useNavigate(); const location = useLocation();
  const [baseline, setBaseline] = useState(initial); const [draft, setDraft] = useState(() => toDraft(initial)); const [errors, setErrors] = useState<Errors>({}); const [failure, setFailure] = useState('');
  const bypass = useRef(false); const [discard, setDiscard] = useState(false); const [review, setReview] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(baseline));
  const blocker = useBlocker(useCallback(() => dirty && !bypass.current, [dirty]));
  const returnTo = typeof location.state?.returnTo === 'string' && /^\/(inventory(?:\?|$)|$)/.test(location.state.returnTo) ? location.state.returnTo : '/inventory';
  useEffect(() => { const listener = (event: BeforeUnloadEvent) => { if (dirty && !bypass.current) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', listener); return () => window.removeEventListener('beforeunload', listener); }, [dirty]);
  const state = inspectUnit(baseline); const preview = inspectUnit(fromDraft(draft));
  const set = (field: Field, value: string | null) => { setDraft(prev => updateDraft(prev, field, value)); setErrors(prev => field === 'type' || field === 'hitch' ? {} : ({ ...prev, [field]: undefined })); setFailure(''); setReview(false); };
  const check = () => {
    const next = validateDraft(draft, units);
    formRef.current?.querySelectorAll<HTMLInputElement>('input[type="number"]').forEach(input => { if (input.validity.badInput) next[input.name as Field] = 'Enter a valid number, or clear this field to leave it incomplete.'; });
    setErrors(next);
    const field = Object.keys(next)[0]; if (field) { if (isNew) setStep(['name', 'stock', 'type'].includes(field) ? 1 : 2); requestAnimationFrame(() => document.getElementById(field)?.focus()); return false; } return true;
  };
  const persist = () => {
    if (!check()) return;
    try {
      const updated = fromDraft(draft); save(updated); bypass.current = true; setBaseline(updated); setDraft(toDraft(updated)); setFailure('');
      const resolved = Math.max(0, state.issues.length - inspectUnit(updated).issues.length);
      notify(isNew ? 'Unit added. ' + (preview.status === 'ready' ? 'Ready to list.' : 'You can finish the missing information later.') : 'Unit updated.' + (resolved ? ' ' + resolved + (resolved === 1 ? ' issue resolved.' : ' issues resolved.') : ' Changes saved in this browser.'));
      if (isNew) navigate('/units/' + updated.id, { replace: true, state: { returnTo: '/inventory' } });
      else { setReview(false); requestAnimationFrame(() => { bypass.current = false; }); }
    } catch (error) { setFailure((error as Error).message); setReview(false); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); if (!check()) return; if (isNew && step === 1) { setStep(2); requestAnimationFrame(() => document.getElementById('specifications-title')?.focus()); } else if (isNew) setReview(true); else persist(); };
  const cancel = () => { if (dirty) setDiscard(true); else navigate(returnTo); };
  const discardChanges = () => { bypass.current = true; setDiscard(false); if (blocker.state === 'blocked') blocker.proceed(); else navigate(returnTo); };
  const focusField = (field: Field) => { const element = document.getElementById(field); element?.scrollIntoView({ block: 'center', behavior: 'instant' }); element?.focus(); };
  return <>
    <Link className="back-link" to={returnTo}><Icon name="back" size={16}/>{returnTo === '/' ? 'Back to dashboard' : 'Back to inventory'}</Link>
    <Header title={isNew ? 'Add unit' : baseline.name} description={isNew ? 'Bring a new unit into your inventory. You can save an incomplete draft.' : baseline.stock + ' · ' + baseline.type + ' · ' + baseline.location} action={false}/>
    <div className="detail-layout min-w-0">
      <aside className="detail-sidebar">
        <div className="panel unit-preview">{draft.photo ? <img src={draft.photo} width="480" height="280" alt={draft.type + ' demo illustration'}/> : <div className="photo-empty"><Icon name="box" size={40}/><span>No image added</span></div>}
          <div className="preview-caption"><span>Sample illustration · not a unit photo</span>{!isNew && <Badge status={state.status}/>}</div>
        </div>
        <section className={'panel issue-panel ' + (state.status === 'ready' && !isNew ? 'clear' : '')} aria-labelledby="issues-title">
          <div className="split"><span className="eyebrow">{isNew ? 'Listing checklist' : 'Saved listing status'}</span>{!isNew && <span className="issue-count">{state.issues.length}</span>}</div>
          <h2 id="issues-title">{!isNew && state.status === 'ready' ? 'Ready to list' : isNew ? 'Finish at your own pace' : 'What needs attention'}</h2>
          {isNew ? <p>Start with a name and unique stock number. Save a draft now, or fill out the rest to make this unit ready.</p> : state.issues.length ? <ul className="issue-list">{state.issues.map(issue => <li key={issue.field}><button type="button" onClick={() => focusField(issue.field)}><span>{issue.label}</span><Icon name="arrow" size={16}/></button><p>{issue.detail}</p></li>)}</ul> : <p>Required information is present and the demo checks pass. This does not publish the listing.</p>}
          {dirty && <p className="unsaved-note">Unsaved changes. The dashboard updates after you save.</p>}
        </section>
        {(baseline.reference?.length || baseline.reference?.condition) && <section className="reference-note"><h3>Fictional intake record</h3><p>{baseline.reference.length && 'Length: ' + baseline.reference.length + ' ft.'} {baseline.reference.condition && 'Condition: ' + baseline.reference.condition + '.'}</p><p>Compare the listing with these sample source values.</p></section>}
      </aside>
      <form ref={formRef} className="editor min-w-0" onSubmit={submit} noValidate>
        {isNew && <ol aria-label="Add unit progress" className="m-0 flex list-none flex-wrap gap-3 p-0 text-sm"><li aria-current={step === 1 && !review ? 'step' : undefined}>1. Basics</li><li aria-current={step === 2 && !review ? 'step' : undefined}>2. Listing details</li><li aria-current={review ? 'step' : undefined}>3. Review</li></ol>}
        <section className="panel form-section"><div className="form-section-title"><span className="section-number">01</span><div><h2>{isNew && step === 1 ? 'Basics' : 'Unit information'}</h2><p>Make this unit easy to identify.</p></div></div>
          <div className="field-grid">
            <label className="field full" hidden={isNew && step === 2}>Unit name <span className="required-label">Required</span><input id="name" value={draft.name} maxLength={100} onChange={event => set('name', event.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined}/>{errors.name && <span id="name-error" className="field-error">{errors.name}</span>}</label>
            <label className="field" hidden={isNew && step === 2}>Stock number <span className="required-label">Required</span><input id="stock" value={draft.stock} maxLength={20} onChange={event => set('stock', event.target.value)} aria-invalid={!!errors.stock} aria-describedby={errors.stock ? 'stock-error' : 'stock-hint'}/><span id={errors.stock ? 'stock-error' : 'stock-hint'} className={errors.stock ? 'field-error' : 'helper'}>{errors.stock || 'A unique ID, such as TR-1048.'}</span></label>
            <label className="field" hidden={isNew && step === 2}>Unit type<select id="type" value={draft.type} onChange={event => set('type', event.target.value)}>{unitTypes.map(type => <option key={type}>{type}</option>)}</select></label>
            <div className="field-grid full" hidden={isNew && step === 1}><NumberField name="year" draft={draft} set={set} errors={errors}/>
            <label className="field">Condition<select id="condition" value={draft.condition} onChange={event => set('condition', event.target.value)}><option value="">Select condition</option><option>New</option><option>Used</option></select>{baseline.reference?.condition && <span className="helper">Intake record: {baseline.reference.condition}.</span>}</label>
            <label className="field full">Location<input id="location" value={draft.location} maxLength={80} onChange={event => set('location', event.target.value)} aria-invalid={!!errors.location}/>{errors.location && <span className="field-error">{errors.location}</span>}</label></div>
          </div>
        </section>
        <section className="panel form-section" hidden={isNew && step === 1}><div className="form-section-title"><span className="section-number">02</span><div><h2 id="specifications-title" tabIndex={-1}>Specifications</h2><p>Use feet for dimensions and pounds for weight.</p></div></div>
          <div className="field-grid">
            <NumberField name="width" draft={draft} set={set} errors={errors} hint="Overall width in feet."/>
            <NumberField name="length" draft={draft} set={set} errors={errors} hint={baseline.reference?.length ? 'Intake record: ' + baseline.reference.length + ' ft.' : 'Overall length in feet.'}/>
            {(draft.type === 'Trailer' || draft.type === 'RV') && <label className="field full">Hitch type<select id="hitch" value={draft.hitch} onChange={event => set('hitch', event.target.value)}><option value="">Select hitch type</option>{hitchTypes.filter(value => draft.type !== 'Trailer' || value !== 'Not applicable').map(value => <option key={value}>{value}</option>)}</select><span className="helper">For a motorized RV, choose Not applicable.</span></label>}
            {isTowable(draft) && <><NumberField name="gvwr" draft={draft} set={set} errors={errors} hint="Maximum rated loaded weight."/><NumberField name="payload" draft={draft} set={set} errors={errors} hint="Carrying capacity; cannot exceed GVWR."/><NumberField name="axles" draft={draft} set={set} errors={errors}/></>}
            {(draft.type === 'Equipment' || (draft.type === 'RV' && draft.hitch === 'Not applicable')) && <NumberField name="usage" draft={draft} set={set} errors={errors} hint={draft.type === 'Equipment' ? 'Operating hours. Use 0 for unused equipment.' : 'Odometer miles. Use 0 if unused.'}/>}
          </div>
          {!isTowable(draft) && <p className="helper specifications-note">Towing weights, axles, and hitch requirements do not apply to this unit in the demo.</p>}
        </section>
        <section className="panel form-section" hidden={isNew && step === 1}><div className="form-section-title"><span className="section-number">03</span><div><h2>Listing details</h2><p>Set the advertised price and add a sample image.</p></div></div>
          <div className="field-grid"><NumberField name="price" draft={draft} set={set} errors={errors} hint="Advertised price in US dollars."/>
          <div className="field full"><span id="photo-label">Listing image</span><div className="image-picker"><p>Use a built-in {draft.type.toLowerCase()} illustration for this fictional record. This is not a real unit photo.</p><div className="actions"><button id="photo" type="button" aria-labelledby="photo-label photo-button-text" onClick={() => set('photo', '/images/' + draft.type.toLowerCase() + '.svg')}><span id="photo-button-text">{draft.photo ? 'Use matching demo image' : 'Add demo image'}</span></button>{draft.photo && <button type="button" onClick={() => set('photo', null)}>Remove image</button>}</div></div></div></div>
        </section>
        {Object.values(errors).some(Boolean) && <div className="notice danger" role="alert">Check the highlighted fields before saving.</div>}
        {failure && <div className="notice danger" role="alert">{failure}</div>}
        <div className="editor-actions"><div><strong>{dirty ? 'Unsaved changes' : isNew ? 'New unit' : 'All changes saved'}</strong><span>{preview.issues.length ? preview.issues.length + ' listing ' + (preview.issues.length === 1 ? 'issue remains' : 'issues remain') : 'Ready to list after saving'}</span></div><div className="actions"><button type="button" onClick={cancel}>Cancel</button>{isNew && step === 2 && <button type="button" onClick={() => setStep(1)}>Back</button>}{isNew && <button type="button" onClick={persist}>Save draft</button>}<button className="primary" type="submit" disabled={!dirty && !isNew}>{isNew ? (step === 1 ? 'Continue' : 'Review unit') : 'Save changes'}</button></div></div>
      </form>
    </div>
    {(discard || blocker.state === 'blocked') && <Dialog title="Discard changes?" confirmLabel="Discard changes" onClose={() => { setDiscard(false); if (blocker.state === 'blocked') blocker.reset(); }} confirm={discardChanges}><p>Your unsaved edits will be lost. The saved record will stay unchanged.</p></Dialog>}
    {review && <Dialog title="Review new unit" confirmLabel="Save unit" onClose={() => setReview(false)} confirm={persist}><p><strong>{draft.name}</strong><br/>{draft.stock.toUpperCase()} · {draft.type} · {money(fromDraft(draft).price)}</p><Badge status={preview.status}/><p>{preview.issues.length ? 'You can finish this later. Saving now adds an incomplete unit to Needs attention.' : 'The required information is complete. This unit will be ready to list.'}</p></Dialog>}
  </>;
}
export function NotFound() { return <><Header title="Unit not found" description="This link may be outdated, or the demo data may have been reset." action={false}/><Empty title="Let's get you back to inventory" action={<Link className="button primary" to="/inventory">View inventory</Link>}>Choose a unit from the current list.</Empty></>; }



