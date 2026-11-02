import { starterTitle } from '../starter';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';

const applicationStatus = createServerFn({ method: 'GET' }).handler(async ({ context }) => {
  const { readApplicationStatus } = await import('../lib/application.server');
  return readApplicationStatus(context);
});

export const Route = createFileRoute('/')({
  loader: () => applicationStatus(),
  component: Home,
});

function Home() {
  const router = useRouter();
  const status = Route.useLoaderData();
  return <section className="stack"><h1>{starterTitle}</h1><p>Your web application is ready to build.</p><p data-rendering="server">Rendered on the server. {status.api === null ? 'Backend not added' : status.api ? 'API: connected' : 'API: unavailable'}.</p>{status.authentication && <a href="/sign-in">Your account</a>}<Button onClick={() => void router.invalidate()}>Check connection</Button></section>;
}
