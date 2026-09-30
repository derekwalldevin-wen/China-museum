import type { Category, Era } from '../data/types';
import { CATEGORY_OPTIONS, ERA_OPTIONS } from '../data/collection';

interface Props {
  era: Era | null;
  category: Category | null;
  onEra: (e: Era | null) => void;
  onCategory: (c: Category | null) => void;
}

export default function FilterBar({ era, category, onEra, onCategory }: Props) {
  return (
    <div className="atlas-filterbar flex min-w-0 flex-1 items-center gap-2 md:flex-wrap md:gap-x-3 md:gap-y-1">
      <div className="atlas-era-strip hidden md:flex items-center gap-1 shrink-0">
        <span className="atlas-filter-label font-mono text-[10px] tracking-[0.16em] text-[#b49a63] mr-1">年代</span>
        {ERA_OPTIONS.map((e) => (
          <button key={e}
            type="button"
            aria-pressed={era === e}
            onClick={() => onEra(era === e ? null : e)}
            className={`atlas-era-tab px-2 py-0.5 text-[11px] border-b transition-colors
              ${era === e
                ? 'text-[#e7dfc9] border-[#b49a63] bg-[#b49a63]/[.04]'
                : 'text-[#d8cfb7]/48 border-transparent bg-transparent hover:border-[#b49a63]/35 hover:text-[#e7dfc9]'}`}>
            {e}
          </button>
        ))}
      </div>
      <select
        aria-label="选择朝代"
        value={era ?? ''}
        onChange={(event) => onEra((event.target.value || null) as Era | null)}
        className="atlas-filter-select min-h-11 md:hidden min-w-0 flex-1 bg-[#080a09]/90 border border-[#d8cfb7]/15 text-[#d8cfb7] text-xs px-2 py-1.5 outline-none focus:border-[#b49a63]"
      >
        <option value="">全部朝代</option>
        {ERA_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <div className="flex min-w-0 flex-1 items-center gap-1 md:flex-initial md:shrink-0">
        <span className="atlas-filter-label hidden md:inline font-mono text-[10px] tracking-[0.16em] text-[#b49a63] mr-1">门类</span>
        <select
          aria-label="选择类别"
          value={category ?? ''}
          onChange={(e) => onCategory((e.target.value || null) as Category | null)}
          className="atlas-filter-select min-h-11 min-w-0 w-full bg-[#080a09]/90 border border-[#d8cfb7]/15 text-[#d8cfb7] text-xs px-2 py-1.5 outline-none focus:border-[#b49a63] md:min-h-0 md:w-auto md:border-x-0 md:border-t-0 md:border-b-[#d8cfb7]/15 md:bg-transparent md:text-[11px] md:px-1.5 md:py-0.5">
          <option value="">全部类别</option>
          {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
  );
}
