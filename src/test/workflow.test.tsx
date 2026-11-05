import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { App, Dashboard, Inventory, UnitPage } from '../App';
import { STORAGE_KEY } from '../storage';
function mount(path = '/') {
  const router = createMemoryRouter([{ element:<App/>, children:[{ path:'/', element:<Dashboard/> }, { path:'/inventory', element:<Inventory/> }, { path:'/units/new', element:<UnitPage/> }, { path:'/units/:id', element:<UnitPage/> }] }], { initialEntries:[path] });
  const view = render(<RouterProvider router={router}/>); return { router, ...view };
}
beforeEach(() => { localStorage.clear(); });
describe('editing workflow', () => {
  it('validates, saves, updates dashboard and survives a new application mount', async () => {
    const user=userEvent.setup(); const app=mount('/units/tr-1042');
    await user.type(screen.getByLabelText('Price (USD)'), '-10');
    await user.click(screen.getByRole('button', {name:'Save changes'}));
    expect(screen.getByLabelText('Price (USD)')).toHaveAttribute('aria-invalid','true');
    await user.clear(screen.getByLabelText('Price (USD)')); await user.type(screen.getByLabelText('Price (USD)'), '6995');
    await user.click(screen.getByRole('button', {name:'Save changes'}));
    expect(await screen.findByText('Unit updated. 1 issue resolved.')).toBeInTheDocument();
    await user.click(screen.getByRole('link', {name:/^Dashboard$/}));
    expect(screen.getByRole('link', {name:/Ready to list 107/})).toBeInTheDocument();
    expect(screen.getByRole('link', {name:/Needs attention 21 13 incomplete/})).toBeInTheDocument();
    app.unmount(); mount('/units/tr-1042'); expect(screen.getByLabelText('Price (USD)')).toHaveValue(6995);
  });
  it('keeps saved data unchanged when Cancel discards edits', async () => {
    const user=userEvent.setup(); const app=mount('/units/tr-1042');
    await user.type(screen.getByLabelText('Price (USD)'), '1000'); await user.click(screen.getByRole('button',{name:'Cancel'}));
    const dialog=screen.getByRole('dialog'); expect(within(dialog).getByText('Discard changes?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button',{name:'Discard changes'}));
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/inventory'));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it('blocks navigation, supports keep editing and retains the draft', async () => {
    const user=userEvent.setup(); const app=mount('/units/tr-1042');
    await user.type(screen.getByLabelText('Price (USD)'), '1000');
    await user.click(screen.getByRole('link', {name:/^Dashboard$/}));
    await user.click(screen.getByRole('button',{name:'Keep editing'}));
    expect(app.router.state.location.pathname).toBe('/units/tr-1042'); expect(screen.getByLabelText('Price (USD)')).toHaveValue(1000);
  });
  it('keeps edits available and reports storage failure instead of claiming success', async () => {
    const user=userEvent.setup(); mount('/units/tr-1042');
    const spy=vi.spyOn(Storage.prototype,'setItem').mockImplementation(() => { throw new Error('quota'); });
    await user.type(screen.getByLabelText('Price (USD)'), '6995'); await user.click(screen.getByRole('button',{name:'Save changes'}));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
    expect(screen.getByLabelText('Price (USD)')).toHaveValue(6995); expect(screen.queryByText('Unit updated. 1 issue resolved.')).toBeNull(); spy.mockRestore();
  });
  it('adds a draft then resets all demo changes intentionally', async () => {
    const user=userEvent.setup(); const app=mount('/units/new');
    await user.type(screen.getByLabelText(/Unit name/), 'Demo trailer');
    await user.type(screen.getByLabelText(/Stock number/), 'TEST-1');
    await user.click(screen.getByRole('button',{name:'Save draft'}));
    await waitFor(() => expect(app.router.state.location.pathname).not.toBe('/units/new'));
    await user.click(screen.getByRole('link',{name:/^Dashboard$/}));
    expect(screen.getByRole('link',{name:/Total units 129/})).toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Reset demo data'}));
    await user.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Reset demo data'}));
    expect(screen.getByRole('link',{name:/Total units 128/})).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).units).toHaveLength(128);
  });
});
it('continues from basics to listing details and reviews before saving', async () => {
  const user = userEvent.setup();
  const {router} = mount('/units/new');
  await user.click(screen.getByRole('button', {name: 'Continue'}));
  expect(screen.getByRole('button', {name: 'Continue'})).toBeVisible();
  await user.type(screen.getByLabelText(/Unit name/), 'Sample flatbed');
  await user.type(screen.getByLabelText(/Stock number/), 'TEST-2');
  await user.click(screen.getByRole('button', {name: 'Continue'}));
  await user.type(screen.getByRole('spinbutton', {name: 'Price (USD)'}), '3500');
  await user.click(screen.getByRole('button', {name: 'Review unit'}));
  const dialog = screen.getByRole('dialog', {name: 'Review new unit'});
  expect(within(dialog).getByText('Sample flatbed')).toBeVisible();
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  await user.click(within(dialog).getByRole('button', {name: 'Save unit'}));
  await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/units\/unit-/));
});
