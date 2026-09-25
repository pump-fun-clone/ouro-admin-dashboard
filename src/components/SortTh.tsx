type SortDir = "asc" | "desc";

export function SortTh({
  label,
  col,
  sort,
  dir,
  onSort,
}: {
  label: string;
  col: string;
  sort: string;
  dir: SortDir;
  onSort: (col: string) => void;
}) {
  const active = sort === col;
  return (
    <th>
      <button type="button" className={`sort-th${active ? " on" : ""}`} onClick={() => onSort(col)}>
        {label}
        <span className="sort-ind" aria-hidden>
          {active ? (dir === "asc" ? " ▲" : " ▼") : " ↕"}
        </span>
      </button>
    </th>
  );
}

export type { SortDir };
