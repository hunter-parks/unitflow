import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App, Dashboard, Inventory, UnitPage, NotFound } from './App';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './styles.css';
const router = createBrowserRouter([{ element: <App />, children: [
  { path: '/', element: <Dashboard /> },
  { path: '/inventory', element: <Inventory /> },
  { path: '/units/new', element: <UnitPage /> },
  { path: '/units/:id', element: <UnitPage /> },
  { path: '*', element: <NotFound /> },
] }]);
createRoot(document.getElementById('root')!).render(<StrictMode><RouterProvider router={router} /></StrictMode>);

