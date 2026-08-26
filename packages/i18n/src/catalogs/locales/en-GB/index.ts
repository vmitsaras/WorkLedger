import admin from './admin.json' with { type: 'json' };
import auth from './auth.json' with { type: 'json' };
import employee from './employee.json' with { type: 'json' };
import manager from './manager.json' with { type: 'json' };
import output from './output.json' with { type: 'json' };
import shared from './shared.json' with { type: 'json' };
import system from './system.json' with { type: 'json' };

import type { LoadedCatalog } from '../../../catalog.js';

export const catalog = {
  locale: 'en-GB',
  resources: { admin, auth, employee, manager, output, shared, system },
} as const satisfies LoadedCatalog;
