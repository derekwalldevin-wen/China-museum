import type { ReactElement } from 'react';
import type { ArtShape } from '../data/types';

// ============================================================
// 统一 2D 画风：深夜展厅聚光 + 纸色线刻 + 朱砂印章
// 所有文物共用同一套笔触语言（描边4px圆头、纸色、单点朱砂）
// ============================================================

const S = {
  stroke: '#e7ddc4',
  faint: '#8f8871',
  red: '#d43a28',
  gold: '#c9a961',
};

/** 各器物的线刻路径（viewBox 0 0 240 240，地平线 y=196） */
const SHAPES: Record<ArtShape, ReactElement> = {
  ding: (<>
    <path d="M96 66 v-14 M144 66 v-14" />{/* 耳 */}
    <path d="M92 52 q28 -14 56 0" fill="none" />
    <path d="M84 66 h72 v14 q0 46 -24 56 q-12 5 -12 5 h-12 q0 0 -12 -5 q-24 -10 -24 -56 z" />
    <path d="M96 141 l-6 40 M144 141 l6 40 M120 143 v40" />{/* 三足 */}
    <circle cx="120" cy="98" r="10" fill="none" />
    <path d="M92 118 h56" opacity="0.5" />
  </>),
  zun: (<>
    <path d="M82 56 q38 -16 76 0 q-6 22 -16 34 q22 30 14 62 q-4 26 -36 26 q-32 0 -36 -26 q-8 -32 14 -62 q-10 -12 -16 -34 z" />
    <path d="M96 118 q24 10 48 0 M94 142 q26 12 52 0" opacity="0.55" />
    <circle cx="120" cy="86" r="7" fill="none" />
  </>),
  bell: (<>
    <path d="M108 50 h24 v12 h-24 z" />
    <path d="M86 66 h68 v18 q0 58 10 78 q-28 14 -44 14 q-16 0 -44 -14 q10 -20 10 -78 z" />
    <circle cx="102" cy="94" r="3.5" fill={S.stroke} />
    <circle cx="120" cy="94" r="3.5" fill={S.stroke} />
    <circle cx="138" cy="94" r="3.5" fill={S.stroke} />
    <circle cx="102" cy="122" r="3.5" fill={S.stroke} />
    <circle cx="120" cy="122" r="3.5" fill={S.stroke} />
    <circle cx="138" cy="122" r="3.5" fill={S.stroke} />
  </>),
  sword: (<>
    <path d="M62 178 L168 72 l10 10 L72 188 z" />
    <path d="M52 160 l28 28" />
    <path d="M44 168 l-6 24 l24 -6" />
    <circle cx="50" cy="180" r="5" fill="none" />
    <path d="M84 150 l18 18" opacity="0.5" />
  </>),
  axe: (<>
    <path d="M112 44 h16 v40 h-16 z" />
    <path d="M88 84 h64 l10 54 q-42 22 -84 0 z" />
    <path d="M78 152 q42 26 84 0 l-6 14 q-36 20 -72 0 z" fill={S.stroke} opacity="0.25" />
    <circle cx="120" cy="112" r="9" fill="none" />
  </>),
  vase: (<>
    <path d="M106 50 h28 v12 h-28 z" />
    <path d="M104 62 q-6 10 2 20 q22 14 14 26 q-30 20 -28 48 q2 26 28 26 q26 0 28 -26 q2 -28 -28 -48 q-8 -12 14 -26 q8 -10 2 -20" />
    <path d="M100 130 q20 -12 40 0" opacity="0.55" />
  </>),
  bowl: (<>
    <path d="M64 96 h112 q-4 44 -30 60 q-14 8 -26 8 q-12 0 -26 -8 q-26 -16 -30 -60 z" />
    <path d="M102 178 h36 v10 h-36 z" />
    <path d="M80 112 q40 14 80 0" opacity="0.5" />
  </>),
  pot: (<>
    <path d="M100 58 h40 v14 h-40 z" />
    <path d="M100 72 q-34 16 -34 54 q0 44 54 44 q54 0 54 -44 q0 -38 -34 -54" />
    <path d="M82 104 q38 18 76 0 M82 146 q38 18 76 0" opacity="0.5" />
    <circle cx="120" cy="122" r="9" fill="none" />
  </>),
  scroll: (<>
    <path d="M48 84 h144 v76 h-144 z" />
    <path d="M40 78 v88 M200 78 v88" strokeWidth="7" />
    <path d="M66 136 q16 -26 30 -10 q10 12 20 -4 q14 -22 28 -2" fill="none" />
    <circle cx="150" cy="106" r="8" fill="none" />
    <path d="M66 152 h66" opacity="0.45" />
  </>),
  jade: (<>
    <path d="M120 52 a68 68 0 1 1 -46 118" fill="none" strokeWidth="13" />
    <path d="M120 78 a42 42 0 1 0 26 74" fill="none" strokeWidth="4" opacity="0.55" />
    <circle cx="120" cy="120" r="12" fill="none" />
  </>),
  buddha: (<>
    <circle cx="120" cy="78" r="22" />
    <path d="M120 56 a22 22 0 0 1 0 44" fill="none" opacity="0.5" />
    <path d="M96 104 q24 -14 48 0 q14 22 10 46 q22 8 26 30 q-60 18 -120 0 q4 -22 26 -30 q-4 -24 10 -46 z" />
    <path d="M104 128 q16 12 32 0" opacity="0.55" />
  </>),
  figure: (<>
    <circle cx="120" cy="66" r="16" />
    <path d="M104 60 q16 -20 32 0" fill="none" />
    <path d="M104 84 q16 -8 32 0 q8 34 4 62 l8 34 h-56 l8 -34 q-4 -28 4 -62 z" />
    <path d="M104 118 h32" opacity="0.55" />
  </>),
  mask: (<>
    <path d="M120 46 q48 0 52 52 q3 52 -26 74 q-26 12 -52 0 q-29 -22 -26 -74 q4 -52 52 -52 z" />
    <ellipse cx="100" cy="98" rx="11" ry="14" fill="none" />
    <ellipse cx="140" cy="98" rx="11" ry="14" fill="none" />
    <path d="M108 142 q12 8 24 0" fill="none" />
    <path d="M82 62 q-14 -12 -20 -2 M158 62 q14 -12 20 -2" fill="none" />
  </>),
  tree: (<>
    <path d="M120 180 V58" strokeWidth="6" />
    <path d="M120 158 q-30 -4 -44 -30 M120 158 q30 -4 44 -30 M120 120 q-24 -4 -36 -26 M120 120 q24 -4 36 -26 M120 84 q-18 -4 -28 -20 M120 84 q18 -4 28 -20" fill="none" />
    <circle cx="76" cy="122" r="5" fill={S.stroke} />
    <circle cx="164" cy="122" r="5" fill={S.stroke} />
    <circle cx="84" cy="88" r="5" fill={S.stroke} />
    <circle cx="156" cy="88" r="5" fill={S.stroke} />
    <circle cx="120" cy="48" r="6" fill="none" />
    <path d="M96 184 h48 l8 12 h-64 z" fill={S.stroke} opacity="0.25" />
  </>),
  drum: (<>
    <ellipse cx="120" cy="70" rx="56" ry="12" />
    <path d="M64 70 q0 26 16 34 q-10 8 -10 22 q0 34 50 34 q50 0 50 -34 q0 -14 -10 -22 q16 -8 16 -34" fill="none" />
    <circle cx="120" cy="70" r="16" fill="none" />
    <path d="M120 54 v-8 M104 58 l-6 -7 M136 58 l6 -7" opacity="0.6" />
    <path d="M86 128 h68" opacity="0.45" />
  </>),
  lamp: (<>
    <circle cx="96" cy="96" r="12" />
    <path d="M84 108 q-8 30 4 52 l-8 24 h20 l6 -30" fill="none" />
    <path d="M108 118 q26 -8 34 -34 q16 2 14 16 q-2 12 -18 14" fill="none" />
    <ellipse cx="152" cy="80" rx="22" ry="10" />
    <path d="M130 80 q22 8 44 0" fill="none" opacity="0.5" />
  </>),
  cup: (<>
    <path d="M86 52 h68 q-2 34 -14 48 q-8 10 -8 22 l4 34 h-32 l4 -34 q0 -12 -8 -22 q-12 -14 -14 -48 z" />
    <path d="M92 168 h56 v14 h-56 z" />
    <path d="M92 74 h56" opacity="0.5" />
  </>),
  seal: (<>
    <path d="M76 104 h88 v64 h-88 z" />
    <path d="M104 104 q0 -26 16 -26 q16 0 16 26" fill="none" />
    <circle cx="120" cy="66" r="10" fill="none" />
    <path d="M92 124 h56 M92 140 h56 M120 116 v44" opacity="0.5" />
  </>),
  stele: (<>
    <path d="M84 76 q0 -28 36 -28 q36 0 36 28 v96 h-72 z" />
    <path d="M74 176 h92 l8 16 h-108 z" />
    <path d="M98 92 h44 M98 110 h44 M98 128 h44 M98 146 h30" opacity="0.5" />
  </>),
  textile: (<>
    <path d="M120 44 v18 M92 62 h56" />
    <path d="M92 62 q-22 30 -18 66 l14 6 q6 -26 12 -38 l4 84 h32 l4 -84 q6 12 12 38 l14 -6 q4 -36 -18 -66" fill="none" />
    <path d="M104 108 h32 M104 128 h32" opacity="0.5" />
  </>),
  gold: (<>
    <path d="M76 150 l10 -56 l18 30 l16 -46 l16 46 l18 -30 l10 56 z" />
    <path d="M76 150 h88 v18 h-88 z" />
    <circle cx="120" cy="66" r="6" fill={S.gold} />
    <circle cx="86" cy="86" r="5" fill={S.gold} />
    <circle cx="154" cy="86" r="5" fill={S.gold} />
  </>),
  bone: (<>
    <path d="M56 150 L172 84 q12 -6 16 4 q4 10 -8 16 L68 170 q-12 6 -16 -4 q-4 -10 4 -16 z" />
    <circle cx="92" cy="140" r="4.5" fill={S.stroke} />
    <circle cx="116" cy="128" r="4.5" fill={S.stroke} />
    <circle cx="140" cy="116" r="4.5" fill={S.stroke} />
    <circle cx="161" cy="104" r="4.5" fill="none" />
  </>),
  horse: (<>
    <path d="M60 140 q-6 -34 26 -44 q10 -26 26 -30 q8 -12 22 -10 q16 2 18 16 l18 6 q-6 10 -18 8 q-2 14 -14 18 q10 18 4 40 l8 34 M84 122 q-6 22 -4 38 l-6 20 M128 128 q10 18 8 36" fill="none" />
    <circle cx="146" cy="70" r="3" fill={S.stroke} />
    <path d="M64 140 q-12 6 -10 20" fill="none" />
  </>),
  chariot: (<>
    <circle cx="88" cy="148" r="30" />
    <circle cx="88" cy="148" r="6" />
    <path d="M88 118 v60 M58 148 h60 M67 127 l42 42 M109 127 l-42 42" opacity="0.6" />
    <path d="M112 92 h56 v40 h-56 z" />
    <path d="M120 92 q20 -18 40 0" fill="none" />
    <path d="M168 104 h22" />
  </>),
  lacquer: (<>
    <path d="M70 96 h100 v14 h-100 z" />
    <path d="M76 110 h88 v52 h-88 z" />
    <path d="M82 162 h76 l6 16 h-88 z" />
    <path d="M86 128 q17 -12 34 0 q17 12 34 0" fill="none" opacity="0.6" />
    <circle cx="120" cy="146" r="6" fill="none" />
  </>),
  misc: (<>
    <path d="M84 74 l36 -22 l36 22 v70 l-36 22 l-36 -22 z" />
    <path d="M84 74 l36 22 l36 -22 M120 96 v70" fill="none" opacity="0.55" />
    <circle cx="120" cy="122" r="9" fill="none" />
  </>),
};

interface Props {
  shape: ArtShape;
  seal?: string;   // 印章字（一般取类别首字）
  className?: string;
  spotlight?: boolean;
}

export default function ArtifactArt({ shape, seal, className = '', spotlight = true }: Props) {
  return (
    <svg viewBox="0 0 240 240" className={className} role="img">
      <defs>
        <radialGradient id="aa-spot" cx="50%" cy="18%" r="85%">
          <stop offset="0%" stopColor="#3a352a" />
          <stop offset="45%" stopColor="#1e1b15" />
          <stop offset="100%" stopColor="#0e0d0a" />
        </radialGradient>
      </defs>
      {spotlight && <rect width="240" height="240" fill="url(#aa-spot)" />}
      {/* 展台地线 */}
      <line x1="34" y1="196" x2="206" y2="196" stroke={S.faint} strokeWidth="1.5" opacity="0.6" />
      <g
        fill="none"
        stroke={S.stroke}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {SHAPES[shape]}
      </g>
      {seal && (
        <g>
          <rect x="196" y="186" width="30" height="30" rx="2" fill={S.red} />
          <text x="211" y="208" textAnchor="middle" fontSize="18" fill="#0e0d0a"
            fontFamily="'Noto Serif SC', serif" fontWeight="700">{seal}</text>
        </g>
      )}
    </svg>
  );
}
