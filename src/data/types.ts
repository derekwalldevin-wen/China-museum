// 数据模型定义 —— 以后扩展内容只需要改 data/museums.ts

export type Category =
  | '青铜器' | '陶瓷' | '书画' | '玉器' | '金银器'
  | '漆器' | '织绣' | '石刻' | '简牍' | '陶俑' | '杂项';

export type Era =
  | '先秦' | '秦汉' | '魏晋南北朝' | '隋唐五代' | '宋辽金元' | '明清' | '近现代';

/** 2D 插图的图形键，对应 ArtifactArt.tsx 里的统一画风 SVG */
export type ArtShape =
  | 'ding' | 'zun' | 'bell' | 'sword' | 'axe' | 'vase' | 'bowl' | 'pot'
  | 'scroll' | 'jade' | 'buddha' | 'figure' | 'mask' | 'tree' | 'drum'
  | 'lamp' | 'cup' | 'seal' | 'stele' | 'textile' | 'gold' | 'bone'
  | 'horse' | 'chariot' | 'lacquer' | 'misc';

export interface Artifact {
  id: string;
  name: string;
  dynasty: string;      // 如「商」「西汉」「北宋」
  era: Era;             // 朝代筛选分组
  category: Category;   // 类别筛选
  shape: ArtShape;      // 插图图形
  story: string;        // 文物故事（80-150字）
  holdingInstitution?: string; // 藏品实际收藏单位；与当前浏览入口不同才填写
  exhibitionNote?: string; // 已核的展出关系，不能暗示当前仍在展
  inventoryNumber?: string;
  keywords?: string[];
  references?: { title: string; institution: string; url: string; checkedAt: string; supports: string }[];
}

export type ArtifactIndex = Omit<Artifact, 'story' | 'references' | 'keywords' | 'inventoryNumber'>;

export interface Museum {
  id: string;
  name: string;
  province: string;     // 与 provinces.ts 的 name 一致
  city: string;
  coord: [number, number]; // [经度, 纬度]
  artifacts: Artifact[];
}

export interface MuseumIndex extends Omit<Museum, 'artifacts'> {
  artifacts: ArtifactIndex[];
}

export interface ProvinceMeta {
  name: string;   // 标准省名，如「北京市」
  short: string;  // 简称，如「京」
  center: [number, number];
  intro: string;
}
