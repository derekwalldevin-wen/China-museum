import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const imagesPath = path.join(root, 'src', 'data', 'images.json');
const manifestPath = path.join(root, 'assets', 'artifact-image-prompts', 'p1-2026-08-24.json');

const images = JSON.parse(await readFile(imagesPath, 'utf8'));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

const scrollIds = new Set([
  'gg-pft',
  'gg-qljs',
  'gg-qmsh',
  'hun-tbh',
  'qzx-zyj',
  'sh-syt',
]);

const reusedCandidateIds = new Set(['gg-gzdc', 'gg-qljs']);
const sourcePageById = {
  'hk-jgb': 'https://www.hkpm.org.hk/sc/visit/audio-guide/g3-clay-to-treasure',
};

const reviewNotes = {
  'gg-gzdc': '既有统一风格候选通过视觉复核；生成器与生成日期尚待补证。',
  'gg-pft': '卷轴与纸张展陈通过；书迹和印章不可作为原帖文字释读。',
  'gg-qljs': '采用克制的传统手卷候选；详情保留真实全卷。',
  'gg-qmsh': '卷轴语义与虹桥段卡片识别通过；人物建筑为生成式重构。',
  'hb-sjfa': '复杂方案座结构视觉可辨；龙凤构件关系需权威资料核对。',
  'hk-hrz': '白釉孩儿枕器形与枕具语义通过；细节待馆藏资料复核。',
  'hk-jgb': '依据香港故宫官方图精修；青花纹样仍以官方来源图为历史依据。',
  'hlj-gys': '石制尖状器轮廓与材质通过；具体器类判定仍待史实审核。',
  'hn-wzt': '金简比例与材质通过；生成刻辞不可释读。',
  'hub-ywj': '剑身全长与菱形纹节奏通过；铭文和细纹不可作为拓本。',
  'hub-zhy': '三层 L 形钟架和钟列逻辑通过；钟数与构件细节需逐项复核。',
  'hun-tbh': 'T 形帛画轮廓通过；内部神兽、人物与日月纹样为生成式重构。',
  'js-hjm': '金面具薄片、破损与正面陈列通过；五官细节待史料复核。',
  'js-sjc': '十节比例、方体和顶端中孔通过；细刻纹与沁色待实物资料复核。',
  'js-tysn': '四鸟绕日识别通过；红色背衬和外圈按展陈元素处理。',
  'lb-yzl': '保留来源图的抽象 C 形与穿孔；名称和具体形制仍待权威核对。',
  'qzx-lxsf': '残损、贴金与思惟姿态通过；服饰和缺失部位待复核。',
  'qzx-zyj': '保留原卷题签区域和纵行节奏；生成文字不可释读，详情使用原图。',
  'sb-bjl': '紧凑鬲形与牛首装饰关系通过；七牛首细节需多角度资料复核。',
  'sb-jd': '鼎体、双耳与三足视觉通过；纹带和比例待史料复核。',
  'sh-syt': '旧纸、装裱与卷轴展陈通过；书迹和印章不可释读。',
  'sxd-jz': '细长金皮包卷与对角构图通过；微刻纹仍以原图为依据。',
  'tb-tbd': '方体、双耳和四足体系通过；纹带与侧构件待多角度资料复核。',
  'tb-yhc': '梨形瓶和雉鸡花卉主题通过；釉色与具体画意待史料复核。',
  'yx-jg': '两块卜骨的数量与关系通过；生成刻辞不可释读。',
};

function makeReview(id, note = reviewNotes[id]) {
  return {
    visual: 'approved',
    historical: 'pending',
    reviewedAt: '2026-08-25',
    reviewedBy: 'Codex visual QA',
    note,
  };
}

function makeReferences(id, legacy) {
  const references = [
    {
      type: 'local-archive',
      value: legacy.src,
      credit: legacy.credit,
    },
  ];
  if (sourcePageById[id]) {
    references.unshift({
      type: 'museum-record',
      value: sourcePageById[id],
      credit: '香港故宫文化博物馆官方语音导赏',
    });
  }
  return references;
}

function makeAiVariant(id, legacy, fit) {
  const reused = reusedCandidateIds.has(id);
  return {
    src: `/artifacts-v2/p1/${id}.png`,
    kind: 'ai',
    fit,
    credit: 'AI 生成示意 · 基于参考图统一展陈',
    provenance: {
      type: 'ai',
      generator: reused ? '既有 AI 候选资产（生成器待核）' : 'OpenAI image generation',
      promptVersion: manifest.version,
      promptManifest: 'assets/artifact-image-prompts/p1-2026-08-24.json',
      generatedAt: reused ? 'unknown' : '2026-08-24/2026-08-25',
      references: makeReferences(id, legacy),
    },
    review: makeReview(id),
  };
}

function makeSourceVariant(id, legacy) {
  const sourcePage = sourcePageById[id];
  return {
    src: legacy.src,
    kind: 'source',
    fit: 'contain',
    credit: legacy.credit,
    provenance: sourcePage
      ? {
          type: 'source',
          sourceUrl: sourcePage,
          institution: '香港故宫文化博物馆 / 故宫博物院',
          verifiedAt: '2026-08-25',
          linkCheckedAt: '2026-09-15',
          authorizationStatus: 'pending',
        }
      : { type: 'source', authorizationStatus: 'pending' },
    review: {
      visual: 'approved',
      historical: sourcePage ? 'approved' : 'pending',
      reviewedAt: '2026-08-25',
      reviewedBy: 'Codex source QA',
      note: sourcePage
        ? '官方展品图，用于保存器物真实纹样与比例。'
        : '真实来源图用于保存全卷或全文信息；来源页与许可字段仍待补充。',
    },
  };
}

for (const item of manifest.items) {
  const id = item.id;
  const record = images[id];
  if (!record) throw new Error(`Missing image record: ${id}`);
  if (record.sourceReview) continue; // Preserve later provenance decisions and quarantines.

  if (id === 'hk-jgb') {
    record.src = '/artifact-sources/official/hk-jgb.png';
    record.credit = '香港故宫文化博物馆：明永乐青花龙穿花纹扁瓶 © 故宫博物院';
    delete record.ai;
  }

  const legacy = { src: record.src, credit: record.credit };
  const card = makeAiVariant(id, legacy, 'cover');
  const detail = scrollIds.has(id) || id === 'hk-jgb'
    ? makeSourceVariant(id, legacy)
    : makeAiVariant(id, legacy, 'contain');

  record.variants = { card, detail };
}

await writeFile(imagesPath, `${JSON.stringify(images, null, 2)}\n`, 'utf8');
console.log(`Registered ${manifest.items.length} P1 image records with card/detail variants.`);
