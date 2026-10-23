import { Button } from "./components/ui/button.js";
import type { Controller } from "./use-control-panel.js";
import { Icon } from "./components.js";
export function PageHeading({
  tab,
  request,
  project,
  environment,
  context,
}: Controller) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{project?.name || "Welcome to Anhedral"}</div>
        <h1>{tab === "Overview" ? "Your app, taking shape." : tab === "Infrastructure" ? "Build your stack." : tab}</h1>
        <p>
          {tab === "Overview"
            ? "Describe what you need in the conversation. Anhedral builds and tracks the work here."
            : tab === "Infrastructure"
            ? "Choose the pieces. Set up the infrastructure. Ship a verified application."
            : `Manage ${tab.toLowerCase()} for the ${environment} environment.`}
        </p>
      </div>
      {project && (
        <Button
          variant="outline"
          onClick={() =>
            request(
              `${context} Review the current setup and help me resolve its remaining gaps. Do not provision or deploy without the required authorization.`,
            )
          }
        >
          Ask Anhedral <Icon name="arrow" />
        </Button>
      )}
    </div>
  );
}
