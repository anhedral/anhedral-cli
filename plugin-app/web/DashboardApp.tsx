import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, LoaderCircle, Pencil, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '@openai/apps-sdk-ui/components/Button';
import { Input } from '@openai/apps-sdk-ui/components/Input';
import { createBridge } from './bridge.ts';
import { PROJECT_STARTER_PROMPT } from '../shared/starter.ts';
import { ProjectCatalog } from './ProjectCatalog.tsx';
import { ProjectTabs } from './ProjectTabs.tsx';
import { ProjectView, Thumbnail } from './ProjectViews.tsx';
import {
  type Dashboard,
  type DashboardTool,
  type ProjectSummary,
  type Tab,
  type ToolArguments,
} from '../shared/model.ts';

export function DashboardApp() {
  const bridge = useMemo(createBridge, []);
  const [inline, setInline] = useState(false);
  const [data, setData] = useState<Dashboard | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('Overview');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState('');
  const counter = useRef(0);
  const receive = useCallback((snapshot: Dashboard) => {
    setData(snapshot);
    setSelectedId(
      (previous) =>
        snapshot.selectedId ??
        (snapshot.projects.some((site) => site.id === previous) ? previous : null),
    );
  }, []);
  useEffect(() => {
    let mounted = true;
    bridge
      .connect(
        (snapshot) => {
          if (mounted) receive(snapshot);
        },
        (value) => {
          if (mounted) setInline(value);
        },
      )
      .catch(() => {
        if (mounted)
          setError(
            'The inspector could not connect. Check that the Anhedral server is running, then refresh.',
          );
      });
    return () => {
      mounted = false;
      void bridge.close();
    };
  }, [bridge, receive]);
  const site = data?.projects.find((item) => item.id === selectedId);
  async function act(name: DashboardTool, args: ToolArguments) {
    const sequence = ++counter.current;
    setBusy(true);
    setError('');
    try {
      const snapshot = await bridge.call(name, args);
      if (sequence === counter.current) receive(snapshot);
      return snapshot;
    } catch (reason) {
      if (sequence === counter.current)
        setError(reason instanceof Error ? reason.message : 'Something went wrong. Try again.');
    } finally {
      if (sequence === counter.current) setBusy(false);
    }
  }
  async function select(item: ProjectSummary) {
    setSelectedId(item.id);
    setTab('Overview');
    setError('');
    setDraft('');
    setNotice('');
    const sequence = counter.current + 1;
    await act('get_project', { id: item.id });
    if (sequence !== counter.current) return;
    try {
      await bridge.select(item.id, item.name);
    } catch {
      setNotice('Project opened. Conversation context could not be updated.');
    }
  }
  async function ask(text: string) {
    const request = site
      ? `For my selected Anhedral project ${JSON.stringify({ id: site.id, name: site.name })}: ${text}`
      : text;
    setBusy(true);
    setError('');
    setDraft('');
    setNotice('');
    try {
      await bridge.select(site?.id ?? null, site?.name);
      const destination = await bridge.message(request);
      if (destination !== 'composer') setDraft(request);
      setNotice(
        destination === 'composer'
          ? 'Draft added to the composer. Review it before sending.'
          : 'Unsent draft prepared below. Paste it into your Anhedral conversation.',
      );
    } catch {
      setDraft(request);
      setError(
        'The draft could not be opened or copied. Select the text below and paste it into the composer.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function createProject() {
    setBusy(true);
    setError('');
    setDraft('');
    setNotice('');
    try {
      const destination = await bridge.createProject();
      if (destination === 'clipboard') {
        setDraft(PROJECT_STARTER_PROMPT);
        setNotice(
          'Unsent starter draft prepared below. Paste it into a new Anhedral conversation.',
        );
      }
    } catch {
      setDraft(PROJECT_STARTER_PROMPT);
      setError('The starter composer could not be opened. Review and copy the unsent draft below.');
    } finally {
      setBusy(false);
    }
  }
  const refresh = () =>
    void act(site ? 'get_project' : 'list_projects', site ? { id: site.id } : {});
  if (inline && data)
    return (
      <section className="inline-card">
        <h2>{site?.name ?? 'Your Anhedral projects'}</h2>
        <p>
          {site
            ? 'Inspect the selected stack, setup requirements and recorded delivery evidence.'
            : `${data.projects.length} ${data.projects.length === 1 ? 'project' : 'projects'} in your catalog.`}
        </p>
        {error && <p role="alert">{error}</p>}
        <Button
          color="primary"
          onClick={() => {
            void bridge
              .expand()
              .catch(() => setError('Open Anhedral from the sidebar to view the inspector.'));
          }}
        >
          Open inspector
        </Button>
      </section>
    );
  return (
    <main className={`app ${site ? 'detail' : 'listing'}`} aria-busy={busy}>
      <header className="topbar">
        {site ? (
          <>
            <Button
              color="secondary"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setSelectedId(null);
                setError('');
                setDraft('');
                void bridge.select(null);
              }}
            >
              <ArrowLeft size={15} />
              Projects
            </Button>
            <div className="topbar-actions">
              <Button
                color="secondary"
                variant="outline"
                pill={false}
                size="sm"
                disabled={busy}
                onClick={refresh}
              >
                <RefreshCw size={14} />
                Refresh
              </Button>
              <Button
                color="secondary"
                variant="outline"
                pill={false}
                size="sm"
                disabled={busy}
                onClick={() => {
                  void ask(
                    'Inspect the project source and explain its current stack. Ask what I would like to develop next before making changes.',
                  );
                }}
              >
                <Pencil size={14} />
                Continue in Codex
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1>Projects</h1>
            <div className="list-actions">
              <div className="search">
                <Input
                  pill
                  size="lg"
                  startAdornment={<Search size={16} />}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Search projects"
                  placeholder="Search projects"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Button
                color="primary"
                size="lg"
                disabled={busy}
                onClick={() => {
                  void createProject();
                }}
              >
                Create project
              </Button>
            </div>
          </>
        )}
      </header>
      <div className={site ? 'detail-content' : 'list-content'}>
        {error && (
          <div className="banner error" role="alert">
            <span>{error}</span>
            <Button color="secondary" variant="ghost" size="sm" disabled={busy} onClick={refresh}>
              Retry
            </Button>
          </div>
        )}
        {notice && (
          <div className="banner" role="status">
            <Check size={16} />
            <span>{notice}</span>
            <Button
              color="secondary"
              variant="ghost"
              uniform
              size="sm"
              aria-label="Dismiss notice"
              onClick={() => setNotice('')}
            >
              <X size={14} />
            </Button>
          </div>
        )}
        {draft && (
          <div className="draft-fallback">
            <p>Unsent conversation draft</p>
            <textarea
              aria-label="Unsent conversation draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
        )}
        {!data && !error && (
          <div className="loading" role="status">
            <LoaderCircle className="spin" />
            Loading your projects…
          </div>
        )}
        {site ? (
          <>
            <div className="site-heading">
              <Thumbnail site={site} large />
              <div>
                <h1>{site.name}</h1>
                <div className="site-subtitle">
                  <span className="status-dot" />
                  {site.sourceName || 'Source project'} · Local source inspection
                </div>
              </div>
            </div>
            <ProjectTabs tab={tab} setTab={setTab} />
            {site.message && (
              <div className="banner error" role="alert">
                {site.message}
              </div>
            )}
            <div
              role="tabpanel"
              id="site-panel"
              aria-labelledby={`tab-${tab}`}
              className="site-panel"
            >
              {site.inspection ? (
                <ProjectView
                  tab={tab}
                  site={site}
                  busy={busy}
                  rename={(name) => {
                    void act('rename_project', { id: site.id, name });
                  }}
                  request={(text) => {
                    void ask(text);
                  }}
                  forget={() => {
                    void act('forget_project', { id: site.id });
                  }}
                />
              ) : (
                <div className="loading" role="status">
                  <LoaderCircle className="spin" />
                  {busy ? 'Inspecting project…' : 'Refresh to inspect this project.'}
                </div>
              )}
            </div>
          </>
        ) : (
          data && (
            <ProjectCatalog
              data={data}
              search={search}
              busy={busy}
              act={act}
              select={select}
              create={() => {
                void createProject();
              }}
            />
          )
        )}
      </div>
    </main>
  );
}
