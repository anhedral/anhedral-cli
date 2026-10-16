export function ServiceCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-lg border p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm">{description}</p>
    </section>
  );
}
