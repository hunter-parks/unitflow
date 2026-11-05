import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
afterEach(cleanup);
Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { value() { this.setAttribute('open', ''); } });
Object.defineProperty(HTMLDialogElement.prototype, 'close', { value() { this.removeAttribute('open'); } });
window.scrollTo = () => {};

