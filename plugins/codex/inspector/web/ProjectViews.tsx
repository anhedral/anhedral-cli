import { Layers } from 'lucide-react';
import type { ProjectSummary } from '../shared/model.ts';
import { Overview } from './InspectorOverview.tsx';
import { Services } from './ProjectServices.tsx';
import { Stack } from './InspectorStack.tsx';
import { Setup } from './InspectorSetup.tsx';
import { Delivery } from './InspectorDelivery.tsx';
import type { ViewProps } from './InspectorPrimitives.tsx';
export { EmptyState } from './InspectorPrimitives.tsx';

export function Thumbnail({ site, large = false }: { site: ProjectSummary; large?: boolean }) {
  return (
    <span className={`thumbnail ${large ? 'large' : ''}`} aria-hidden="true">
      <span className="thumbnail-bar">
        <i />
        <i />
        <i />
      </span>
      <span className="thumbnail-content">
        <span>{site.name.charAt(0).toUpperCase()}</span>
        <i />
        <i />
      </span>
    </span>
  );
}
export function ProjectEvidence({ site }: { site: ProjectSummary }) {
  return (
    <span className="project-evidence" title={site.products.join(' · ')}>
      <Layers size={14} />
      <span>{site.products.length ? site.products.join(' · ') : 'Stack not recorded'}</span>
    </span>
  );
}

export function ProjectView(props: ViewProps) {
  const inspection = props.site.inspection;
  if (!inspection) return null;
  switch (props.tab) {
    case 'Overview':
      return <Overview {...props} inspection={inspection} />;
    case 'Services':
      return (
        <Services key={props.site.id} inspection={inspection} serviceCall={props.serviceCall} />
      );
    case 'Stack':
      return <Stack inspection={inspection} />;
    case 'Setup':
      return <Setup {...props} inspection={inspection} />;
    case 'Delivery':
      return <Delivery {...props} inspection={inspection} />;
  }
}
