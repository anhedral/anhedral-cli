import { ChevronRight, LayoutGrid, List, Plus, Search } from 'lucide-react';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { ProjectEvidence, EmptyState, Thumbnail } from './ProjectViews.tsx';
import type { Dashboard, DashboardTool, ProjectSummary, ToolArguments } from '../shared/model.ts';
export function ProjectCatalog({
  data,
  search,
  busy,
  act,
  select,
  create,
}: {
  data: Dashboard;
  search: string;
  busy: boolean;
  act: (name: DashboardTool, args: ToolArguments) => Promise<Dashboard | undefined>;
  select: (site: ProjectSummary) => Promise<void>;
  create: () => void;
}) {
  const filtered = data.projects.filter((item) =>
    `${item.name} ${item.products.join(' ')} ${item.sourceName}`
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  return (
    <>
      <div className="view-toolbar">
        <span className="catalog-note">
          {data.projects.length
            ? `${data.projects.length} ${data.projects.length === 1 ? 'project' : 'projects'}`
            : 'Your projects, together'}{' '}
        </span>
        <div className="view-switch" aria-label="Project view">
          <Button
            color="secondary"
            variant="ghost"
            uniform
            aria-label="Grid view"
            selected={data.preferences.view === 'grid'}
            disabled={busy}
            onClick={() => {
              void act('set_view', { view: 'grid' });
            }}
          >
            <LayoutGrid size={16} />
          </Button>
          <Button
            color="secondary"
            variant="ghost"
            uniform
            aria-label="List view"
            selected={data.preferences.view === 'list'}
            disabled={busy}
            onClick={() => {
              void act('set_view', { view: 'list' });
            }}
          >
            <List size={16} />
          </Button>
        </div>
      </div>
      {!data.projects.length ? (
        <EmptyState
          icon={LayoutGrid}
          title="Bring your next idea to life"
          description="Create your first project with Anhedral."
        >
          <Button color="primary" disabled={busy} onClick={create}>
            <Plus size={16} />
            Create your first project
          </Button>
        </EmptyState>
      ) : !filtered.length ? (
        <EmptyState
          icon={Search}
          title="No matching projects"
          description="Try another name or stack option."
        />
      ) : data.preferences.view === 'list' ? (
        <>
          <div className="list-head">
            <span>Project</span>
            <span>Stack</span>
            <span />
          </div>
          <div className="site-list">
            {filtered.map((item) => (
              <button
                className="site-row"
                disabled={busy}
                key={item.id}
                onClick={() => {
                  void select(item);
                }}
              >
                <Thumbnail site={item} />
                <span className="site-name">
                  <strong>{item.name}</strong>
                  <small>
                    {new Date(item.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    · {item.status === 'unavailable' ? 'Unavailable' : 'Source project'}
                  </small>
                </span>
                <ProjectEvidence site={item} />
                <ChevronRight size={16} className="row-arrow" />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="site-grid">
          {filtered.map((item) => (
            <button
              className="site-card"
              disabled={busy}
              key={item.id}
              onClick={() => {
                void select(item);
              }}
            >
              <Thumbnail site={item} large />
              <strong>{item.name}</strong>
              <ProjectEvidence site={item} />
              <small>{item.sourceName || 'Source project'}</small>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
