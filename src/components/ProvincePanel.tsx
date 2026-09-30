import { useState } from 'react';
import type { MuseumIndex, ProvinceMeta } from '../data/types';
import { resolveArtifactCardImage } from '../data/images';
import ArtifactArt from './ArtifactArt';
import ResponsiveArtifactImage from './ResponsiveArtifactImage';

function MuseumThumb({ museum }: { museum: MuseumIndex }) {
  const first = museum.artifacts[0];
  const resolved = first ? resolveArtifactCardImage(first.id) : null;
  const key = `${resolved?.src ?? ''}|${resolved?.fallback?.src ?? ''}`;
  const [load, setLoad] = useState<{ key: string; fallback: boolean; failed: boolean }>({ key, fallback: false, failed: false });

  const current = load.key === key ? load : { key, fallback: false, failed: false };
  const img = current.fallback && resolved?.fallback ? resolved.fallback : resolved;
  if (img && !current.failed) {
    return <ResponsiveArtifactImage image={img} sizes="56px" alt={museum.name} loading="lazy" decoding="async"
      onError={() => {
        if (!current.fallback && resolved?.fallback) setLoad({ key, fallback: true, failed: false });
        else setLoad({ key, fallback: current.fallback, failed: true });
      }}
      className={`w-full h-full opacity-90 ${img.fit === 'contain' ? 'object-contain' : 'object-cover'}`} />;
  }
  return <ArtifactArt shape={first?.shape ?? 'misc'} className="w-full h-full" />;
}

interface Props {
  province: ProvinceMeta;
  museums: MuseumIndex[];
  onPickMuseum: (m: MuseumIndex) => void;
  onClose: () => void;
}

export default function ProvincePanel({ province, museums, onPickMuseum, onClose }: Props) {
  const list = museums.filter((m) => m.province === province.name);
  const artifactTotal = list.reduce((n, m) => n + m.artifacts.length, 0);

  return (
    <aside aria-label={`${province.name}博物馆列表`} className="atlas-province-panel absolute z-30 flex flex-col animate-[slideIn_.42s_cubic-bezier(.2,.8,.2,1)]
      max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[62dvh] max-md:border-t max-md:border-[#efe6cf]/25
      md:right-0 md:top-[7.5rem] md:bottom-[2.8rem] md:w-[360px] md:border-l md:border-[#efe6cf]/20">
      {/* 测绘式档案头 */}
      <header className="shrink-0 p-4 md:p-5 border-b border-[#efe6cf]/15">
        {/* 手机端抓手 */}
        <div className="md:hidden mx-auto mb-3 h-1 w-10 bg-[#efe6cf]/25" />
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="atlas-province-seal h-12 w-12 flex items-center justify-center">
              <span className="font-brush text-3xl text-[#f5eeda] leading-none pt-0.5">{province.short}</span>
            </div>
            <div>
              <div className="font-mono text-[9px] tracking-[0.25em] text-[#b49a63]">
                REGION / {province.center[0].toFixed(2)}°E {province.center[1].toFixed(2)}°N
              </div>
              <h2 className="mt-0.5 font-serif text-2xl text-[#efe6cf]">{province.name}</h2>
            </div>
          </div>
          <button onClick={onClose} aria-label={`关闭${province.name}博物馆列表`}
            className="mt-1 h-11 w-11 shrink-0 border border-[#efe6cf]/30 text-[#efe6cf]/70 hover:border-[#d43a28] hover:text-[#d43a28] focus-visible:border-[#d43a28] focus-visible:outline-none transition-colors">
            ✕
          </button>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-[#efe6cf]/60 max-md:line-clamp-2">{province.intro}</p>
        <div className="mt-3 flex gap-4 font-mono text-[11px] text-[#efe6cf]/50">
          <span>馆 <b className="text-[#b49a63]">{list.length}</b></span>
          <span>收录文物 <b className="text-[#b49a63]">{artifactTotal}</b></span>
        </div>
      </header>

      {/* 博物馆列表 */}
      <div key={province.name} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {list.map((m, i) => (
          <button key={m.id} onClick={() => onPickMuseum(m)} aria-label={`进入${m.name}`}
            className="group w-full text-left px-5 py-4 border-b border-[#d8cfb7]/8 hover:bg-[#b49a63]/[.055] transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 shrink-0 border border-[#efe6cf]/15 overflow-hidden">
                <MuseumThumb museum={m} />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[10px] text-[#b49a63]">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-serif text-[15px] text-[#efe6cf] group-hover:text-white truncate">{m.name}</span>
                </div>
                <div className="mt-1 text-[11px] text-[#efe6cf]/45 line-clamp-1">{m.intro}</div>
                <div className="mt-1 font-mono text-[10px] text-[#efe6cf]/40">
                  {m.city} · 镇馆之宝 {m.artifacts.length} 件 →
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <footer className="shrink-0 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] border-t border-[#efe6cf]/15 font-mono text-[10px] text-[#efe6cf]/35 text-center">
        点击博物馆进入展厅 · ESC 返回总览
      </footer>
    </aside>
  );
}
