import { starterTitle } from '../starter';
import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import '../styles.css';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: starterTitle },
      { name: 'description', content: 'Anhedral web application' },
    ],
  }),
  component: Root,
  notFoundComponent: () => <section className="stack"><h1>Page not found</h1><Link to="/">Return home</Link></section>,
  errorComponent: ({ reset }) => <section className="stack"><h1>Unable to load this page</h1><button type="button" onClick={reset}>Try again</button></section>,
});

function Root() {
  return <Document><main><nav aria-label="Main"><Link to="/">Home</Link></nav><Outlet /></main></Document>;
}

function Document({ children }: { children: ReactNode }) {
  return <html lang="en"><head><HeadContent /></head><body>{children}<Scripts /></body></html>;
}
