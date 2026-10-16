import { ServiceCard } from "@workspace/ui/components/service-card";

const services = [
  ["API and identity", "Hono, OpenAPI, D1, Drizzle and Better Auth"],
  ["Storage and state", "Private R2, KV and Durable Object realtime rooms"],
  ["Background work", "Queues, dead-letter recovery, cron and Workflows"],
  ["Integrations", "Workers AI, Resend, Stripe, Sentry, PostHog and Basin"],
];

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <header>
        <h1 className="text-3xl font-semibold">
          Anhedral full-stack source example
        </h1>
        <p className="mt-3">
          Source scaffolding only. Services are not provisioned or connected.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {services.map(([title, description]) => (
          <ServiceCard key={title} title={title!} description={description!} />
        ))}
      </div>
      <p>
        Start with docs/stack.md, apps/api/src/index.ts and
        packages/db/src/schema.ts.
      </p>
    </main>
  );
}
