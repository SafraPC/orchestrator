import type { ContainerDto } from "../api/types";

export function ContainerTabs(props: {
  containers: ContainerDto[];
  selectedContainer: string | null;
  onSelect: (id: string | null) => Promise<void>;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto overflow-y-hidden" style={{ scrollbarWidth: "none" }}>
      <TabBtn active={props.selectedContainer === null} onClick={() => void props.onSelect(null)}>
        Todos
      </TabBtn>
      {props.containers.map((c) => (
        <TabBtn key={c.id} active={props.selectedContainer === c.id} onClick={() => void props.onSelect(c.id)}>
          {c.name}
        </TabBtn>
      ))}
    </div>
  );
}

function TabBtn(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={`rounded-md px-2.5 py-1 text-2xs font-medium whitespace-nowrap shrink-0 transition-all duration-150 ${
        props.active ? "bg-accent/15 text-accent" : "text-slate-500 hover:text-slate-300 hover:bg-surface-3"
      }`}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}
