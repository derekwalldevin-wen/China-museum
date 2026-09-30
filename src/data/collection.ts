import type { Category, Era, MuseumIndex } from './types';

export interface CollectionFilter {
  era: Era | null;
  category: Category | null;
  province: string | null;
}

export const ERA_OPTIONS: Era[] = ['先秦', '秦汉', '魏晋南北朝', '隋唐五代', '宋辽金元', '明清', '近现代'];
export const CATEGORY_OPTIONS: Category[] = ['青铜器', '陶瓷', '书画', '玉器', '金银器', '漆器', '织绣', '石刻', '简牍', '陶俑', '杂项'];
export const EMPTY_COLLECTION_FILTER: CollectionFilter = { era: null, category: null, province: null };

export function readCollectionFilter(search: string, provinceNames: Set<string>): CollectionFilter {
  const params = new URLSearchParams(search);
  const era = params.get('era');
  const category = params.get('category');
  const province = params.get('region');
  return {
    era: ERA_OPTIONS.includes(era as Era) ? era as Era : null,
    category: CATEGORY_OPTIONS.includes(category as Category) ? category as Category : null,
    province: province && provinceNames.has(province) ? province : null,
  };
}

export function writeCollectionFilter(params: URLSearchParams, filter: CollectionFilter) {
  if (filter.era) params.set('era', filter.era);
  if (filter.category) params.set('category', filter.category);
  if (filter.province) params.set('region', filter.province);
  return params;
}

export function findCollection(museums: MuseumIndex[], filter: CollectionFilter) {
  return museums
    .filter((museum) => !filter.province || museum.province === filter.province)
    .flatMap((museum) => museum.artifacts
      .filter((artifact) => (!filter.era || artifact.era === filter.era)
        && (!filter.category || artifact.category === filter.category))
      .map((artifact) => ({ museum, artifact })));
}
