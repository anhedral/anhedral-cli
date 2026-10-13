import type { ReactNode } from 'react';
import { Boxes, CircleHelp } from 'lucide-react';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import type { ProjectSummary, Tab } from '../shared/model.ts';
import type { InspectionSection } from '../../src/inspector-model.ts';

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Boxes;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={24} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Section<T>({
  title,
  description,
  section,
  children,
}: {
  title: string;
  description: string;
  section: InspectionSection<T>;
  children: (value: T) => ReactNode;
}) {
  return (
    <section className="inspector-section">
      <div className="section-title">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      {section.state === 'available' ? (
        children(section.data)
      ) : (
        <div className="inspection-unavailable" role="status">
          <CircleHelp size={16} />
          <p>
            {section.error ||
              'This evidence could not be read. Refresh after reviewing the source.'}
          </p>
        </div>
      )}
    </section>
  );
}
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="inspection-fact">
      <span>{label}</span>
      <div>{children}</div>
    </div>
  );
}
export function Action({
  children,
  request,
  text,
  busy,
}: {
  children: ReactNode;
  request: (text: string) => void;
  text: string;
  busy: boolean;
}) {
  return (
    <Button
      color="secondary"
      variant="outline"
      pill={false}
      size="sm"
      disabled={busy}
      onClick={() => request(text)}
    >
      {children}
    </Button>
  );
}
export function formatRecordedDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Date not recorded';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export interface ViewProps {
  tab: Tab;
  site: ProjectSummary;
  busy: boolean;
  rename: (name: string) => void;
  request: (text: string) => void;
  forget: () => void;
}
