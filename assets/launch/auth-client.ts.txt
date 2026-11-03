import { createAuthClient } from 'better-auth/react';

// Relative requests keep authentication on the application's public origin.
export const authClient = createAuthClient({ basePath: '/api/auth' });
