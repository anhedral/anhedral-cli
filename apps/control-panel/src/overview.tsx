import { Card } from "./components/ui/card.js";
import { Button } from "./components/ui/button.js";
import { Disclosure, DisclosureTrigger, DisclosureContent } from "./disclosure.js";
import { openAppLink } from "./bridge.js";
import type { Controller } from "./use-control-panel.js";

const names: Record<string, string> = { next: "Web app", hono: "Application API", neon: "Neon database", d1: "Database", expo: "Mobile app", electron: "Desktop app", wxt: "Browser extension", styling: "Design system" };
export function Overview(controller: Controller) {
  const { data, project, environment, nextStep, continueStep, busy, request, context } = controller;
  const current = data?.project ? data : undefined;
  const overview = current?.overview;
  const work = current?.work;
  const links = work?.links && ((!work.links.environment && environment === "default") || work.links.environment === environment) ? work.links : undefined;
  const issue = overview?.issues[0];
  const recheck = overview?.needsRecheck[0];
  const environmentUnobserved = !!work?.observations.length && !overview?.observations.length;
  const next = issue?.summary || (recheck ? `Recheck ${names[recheck.capability] || recheck.capability}: ${recheck.freshness === "drifted" ? "source, configuration or account changed" : "evidence is more than a day old"}.` : "") || (environmentUnobserved ? `Inspect and plan the ${environment} environment with Anhedral.` : work?.nextAction) || nextStep?.summary || nextStep?.detail || "Review the app and its latest evidence with Anhedral.";
  const latest = [...(overview?.observations || [])].sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
  return <div className="app-overview">
    <Card className="next-action" aria-label="Current progress and next action">
      <div>
        <span className="eyebrow">{issue ? "Needs attention" : recheck ? "Evidence needs a recheck" : project?.planned ? "Planning your app" : latest ? "Work in progress" : "Ready to build"}</span>
        <h2>{work?.appName || project?.name}</h2>
        {project?.brief && <p>{project.brief}</p>}
        {latest && <p><strong>Latest progress:</strong> {latest.summary}</p>}
        <p><strong>{issue ? "Blocker:" : "Next action:"}</strong> {next}</p>
      </div>
      <Button disabled={busy} onClick={() => work ? request(`${context} Read anhedral.progress.json and recheck stale observations against the current source and selected accounts. Continue this next action: ${next}. Use anhedral_report_observations after meaningful work and return preview/live links when verified. Preserve existing authorization and request only missing access, spending or release authority.`) : continueStep()}>{issue ? "Resolve with Anhedral" : "Continue building"}</Button>
    </Card>
    {!!(links?.preview || links?.live) && <div className="app-links">
      {(["preview", "live"] as const).map((kind) => links[kind] && <Button key={kind} variant={kind === "live" ? "default" : "outline"} onClick={() => openAppLink(links[kind]!).catch(() => controller.setNotice("Unable to open the app link."))}>Open {kind === "live" ? "live app" : "preview"} ↗</Button>)}
      <span className="muted-copy">{links?.environment ? `${links.environment} links` : "Project links · environment unspecified"} · recorded by Anhedral</span>
    </div>}
    <section aria-label="Live application stack" className="stack-map">
      <div className="section-toolbar"><h2>Your app's stack</h2><span>{environment} · {overview?.nodes.length || 0} pieces</span></div>
      <p className="muted-copy">Connections show the intended architecture. Each piece keeps its own observed progress.</p>
      <div className="stack-pieces">
        {overview?.nodes.map((node) => <Card key={node.id} className={`stack-piece ${node.issue ? "stack-issue" : ""}`}>
          <small>{node.group}</small><strong>{names[node.id] || node.id}</strong><span>{node.purpose}</span>
          <div className="milestone-list">{node.milestones.length ? node.milestones.map((item) => <span className={`milestone ${item.status}`} key={item.milestone}>{item.status === "succeeded" ? "✓" : item.status === "failed" ? "!" : "○"} {item.milestone} · {item.status}{item.freshness !== "current" ? ` · ${item.freshness}` : ""}</span>) : <span className="milestone">○ Planned</span>}</div>
          {node.issue && <small role="status">{node.issue.summary}</small>}
        </Card>)}
      </div>
      {!!overview?.edges.length && <ul className="stack-relationships" aria-label="Planned stack relationships">{overview.edges.map((edge) => <li key={`${edge.from}-${edge.to}`}><strong>{names[edge.from] || edge.from}</strong><span aria-hidden="true"> → </span>{names[edge.to] || edge.to}<small>{edge.label}</small></li>)}</ul>}
      {!overview?.nodes.length && <p>Describe your app to Anhedral to see the proposed stack here.</p>}
    </section>
    <Disclosure className="selected-stack">
      <DisclosureTrigger><strong>Progress evidence</strong><span>{overview?.observations.length || 0} observations · view details</span></DisclosureTrigger>
      <DisclosureContent><div className="stack-content">
        {overview?.observations.map((item) => <div className="progress-evidence" key={`${item.capability}-${item.milestone}`}><strong>{names[item.capability] || item.capability} · {item.milestone} · {item.status}</strong><p>{item.summary}</p><small>{item.source} · {new Date(item.observedAt).toLocaleString()} · {item.freshness}{!item.identityRecorded ? " · source/config identity not recorded" : ""}</small>{item.evidence.map((text) => <p key={text}>{text}</p>)}{item.identity && <small>{Object.entries(item.identity).map(([key, value]) => `${key}: ${value}`).join(" · ")}</small>}</div>)}
        {!overview?.observations.length && <p>As Anhedral works, it records dated observations and evidence here.</p>}
        <p className="muted-copy">A deployment observation does not establish working connectivity or tested product behavior. Recheck evidence after source, configuration or account changes.</p>
      </div></DisclosureContent>
    </Disclosure>
    {!!work?.discoveries.length && <Disclosure className="selected-stack"><DisclosureTrigger><strong>Tools and access observations</strong><span>View details</span></DisclosureTrigger><DisclosureContent><div className="stack-content">{work.discoveries.map((item) => <div className="progress-evidence" key={`${item.kind}-${item.name}-${item.scope}`}><strong>{item.kind} · {item.name} · {item.status}</strong><p>{item.summary}</p><small>{item.scope} · {new Date(item.observedAt).toLocaleString()}</small></div>)}<p className="muted-copy">Available tools, local developer tools, authenticated accounts and working integrations are separate observations.</p></div></DisclosureContent></Disclosure>}
  </div>;
}
