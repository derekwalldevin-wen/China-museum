import { useEffect, useMemo, useRef } from 'react';
import type { MuseumIndex, ProvinceMeta } from '../data/types';

interface Props {
  provinces: ProvinceMeta[];
  museums: MuseumIndex[];
  selectedProvince: string | null;
  onPickProvince: (name: string) => void;
  onClose: () => void;
}

export default function RegionDirectory({
  provinces,
  museums,
  selectedProvince,
  onPickProvince,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const entries = useMemo(() => provinces.map((province) => {
    const regionMuseums = museums.filter((museum) => museum.province === province.name);
    return {
      province,
      museumCount: regionMuseums.length,
      artifactCount: regionMuseums.reduce((total, museum) => total + museum.artifacts.length, 0),
    };
  }), [museums, provinces]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusFrame = requestAnimationFrame(() => closeRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-[45] flex items-center justify-center bg-[#070604]/90 p-3 backdrop-blur-sm md:p-8"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="region-directory-title"
        tabIndex={-1}
        className="relative flex h-full max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden border border-[#efe6cf]/20 bg-[#0d0c09] shadow-[0_28px_90px_rgba(0,0,0,.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="relative border-b border-[#efe6cf]/15 px-5 py-5 md:px-8 md:py-7">
          <div className="pr-14">
            <div className="font-mono text-[12px] tracking-[0.3em] text-[#d43a28]">NATIONAL INDEX / 34 REGIONS</div>
            <h2 id="region-directory-title" className="mt-1 font-serif text-2xl text-[#efe6cf] md:text-4xl">全国博物馆目录</h2>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#efe6cf]/55 md:text-sm">
              地图用于发现，目录用于抵达。选择省份，直接查看已收录的博物馆与代表文物。
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="关闭全国博物馆目录"
            onClick={onClose}
            className="absolute right-4 top-4 h-11 w-11 border border-[#efe6cf]/30 text-[#efe6cf]/70 transition-colors hover:border-[#d43a28] hover:text-[#d43a28] focus-visible:border-[#d43a28] focus-visible:outline-none md:right-7 md:top-7"
          >✕</button>
        </header>

        <div className="ruler h-2.5 shrink-0 opacity-50" />

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 md:px-8 md:py-7">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-5">
            {entries.map(({ province, museumCount, artifactCount }, index) => {
              const active = province.name === selectedProvince;
              return (
                <button
                  key={province.name}
                  type="button"
                  aria-label={`${province.name}，${museumCount}家博物馆，${artifactCount}件文物`}
                  onClick={() => onPickProvince(province.name)}
                  className={`group relative min-h-28 overflow-hidden border p-3 text-left transition-[border-color,background-color,transform] duration-200 active:scale-[.98] md:min-h-32 md:p-4
                    ${active
                      ? 'border-[#d43a28] bg-[#d43a28]/10'
                      : 'border-[#efe6cf]/14 bg-[#12100b] hover:border-[#d43a28]/75 hover:bg-[#17130d]'}`}
                >
                  <span className="absolute right-2 top-2 font-mono text-[12px] tabular-nums text-[#efe6cf]/25">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={`grid h-9 w-9 place-items-center font-brush text-xl ${active ? 'bg-[#d43a28]' : 'bg-[#b83524]'} text-[#f5eeda] shadow-md`}>
                    {province.short}
                  </span>
                  <span className="mt-3 block truncate font-serif text-base text-[#efe6cf] group-hover:text-white md:text-lg">{province.name}</span>
                  <span className="mt-1 block font-mono text-[12px] text-[#efe6cf]/42 md:text-[12px]">
                    馆 <b className="font-normal text-[#d43a28]">{museumCount}</b>
                    <span className="mx-1.5 text-[#efe6cf]/18">/</span>
                    文物 <b className="font-normal text-[#d43a28]">{artifactCount}</b>
                  </span>
                  <span className="absolute bottom-0 left-0 h-px w-0 bg-[#d43a28] transition-all duration-300 group-hover:w-full" />
                </button>
              );
            })}
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-[#efe6cf]/12 px-5 py-3 font-mono text-[12px] text-[#efe6cf]/35 md:px-8 md:text-[12px]">
          <span>选择省份进入博物馆名录</span>
          <span>ESC 关闭 · TAB 浏览</span>
        </footer>
      </div>
    </div>
  );
}
