import { FileCode2 } from 'lucide-react';
import type { ProjectInspection } from '../../../../src/inspector-model.ts';
import { Section } from './InspectorPrimitives.tsx';

export function Stack({ inspection }: { inspection: ProjectInspection }) {
  return (
    <>
      <Section
        title="Workspaces"
        description="Application and shared package manifests, without inferred deployment ownership"
        section={inspection.workspaces}
      >
        {(workspaces) =>
          workspaces.length ? (
            <div className="inspection-cards">
              {workspaces.map((workspace) => (
                <article className="panel inspection-card" key={workspace.directory}>
                  <div className="inspection-card-heading">
                    <FileCode2 size={18} />
                    <div>
                      <h3>{workspace.name}</h3>
                      <p>
                        <code>{workspace.directory}</code>
                      </p>
                    </div>
                  </div>
                  {(
                    [
                      'dependencies',
                      'devDependencies',
                      'peerDependencies',
                      'optionalDependencies',
                    ] as const
                  ).map((kind) => {
                    const dependencies = workspace.dependencies.filter(
                      (dependency) => dependency.kind === kind,
                    );
                    return dependencies.length ? (
                      <div className="dependency-group" key={kind}>
                        <p>
                          {kind === 'dependencies'
                            ? 'Package dependencies'
                            : kind === 'devDependencies'
                              ? 'Development dependencies'
                              : kind === 'peerDependencies'
                                ? 'Peer dependencies'
                                : 'Optional dependencies'}
                        </p>
                        <div className="stack-tags">
                          {dependencies.map((dependency) => (
                            <span key={dependency.name}>{dependency.name}</span>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })}
                </article>
              ))}
            </div>
          ) : (
            <p className="section-note">No workspace manifests recorded.</p>
          )
        }
      </Section>
      <Section
        title="Bindings and schedules"
        description="Recorded application configuration; identifiers do not prove active resources"
        section={inspection.configuration}
      >
        {(configuration) => (
          <>
            <div className="inspection-list">
              {configuration.bindings.map((binding) => (
                <div
                  className="inspection-item"
                  key={`${binding.application}/${binding.kind}/${binding.name}`}
                >
                  <div>
                    <strong>
                      <code>{binding.name}</code>
                    </strong>
                    <p>
                      {binding.application} · {binding.kind}
                    </p>
                    {binding.resourceId && (
                      <small>
                        <code>{binding.resourceId}</code>
                      </small>
                    )}
                  </div>
                  <span className="status-tag">
                    {!binding.identifierRequired
                      ? 'Binding declared'
                      : binding.configured
                        ? 'Identifier configured'
                        : 'Identifier needed'}
                  </span>
                </div>
              ))}
            </div>
            {configuration.schedules.map((schedule) => (
              <div
                className="inspection-item"
                key={`${schedule.application}/${schedule.expression}`}
              >
                <div>
                  <strong>
                    <code>{schedule.expression}</code>
                  </strong>
                  <p>{schedule.application} · Activation and runs not verified</p>
                </div>
              </div>
            ))}
            {!configuration.bindings.length && !configuration.schedules.length && (
              <p className="section-note">No bindings or schedules recorded.</p>
            )}
          </>
        )}
      </Section>
    </>
  );
}
