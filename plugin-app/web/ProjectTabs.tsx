import { TABS, type Tab } from '../shared/model.ts';
export function ProjectTabs({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  return (
    <div className="tabs" role="tablist" aria-label="Project sections">
      {TABS.map((value, index) => (
        <button
          key={value}
          id={`tab-${value}`}
          role="tab"
          aria-selected={value === tab}
          aria-controls="site-panel"
          tabIndex={value === tab ? 0 : -1}
          onClick={() => setTab(value)}
          onKeyDown={(event) => {
            let next = index;
            if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
            else if (event.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = TABS.length - 1;
            else return;
            event.preventDefault();
            setTab(TABS[next]);
            document.getElementById(`tab-${TABS[next]}`)?.focus();
          }}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
