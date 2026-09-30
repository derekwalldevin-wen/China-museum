import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const imagesPath = path.join(root, 'src', 'data', 'images.json');
const manifestPath = path.join(root, 'assets', 'artifact-image-prompts', 'p2-source-2026-08-27.json');
const availableOnly = process.argv.includes('--available-only');

const images = JSON.parse(await readFile(imagesPath, 'utf8'));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const registered = [];
const skipped = [];

const approvedVisualNotes = {
  'gb-hmwd': '既有风格样片通过视觉复核；鼎体、双耳、四足和主要纹带关系清晰，细部仍待史实审核。',
  'gb-jgs': '既有风格样片通过视觉复核；说唱俑姿态、鼓与陶质语义明确，细部仍待史实审核。',
  'hb-jly': '既有风格样片通过视觉复核；玉衣完整人形与玉片网格清晰，编缀细节仍待史实审核。',
  'hun-ssd': '既有风格样片通过视觉复核；襌衣形制、透明质感与缘饰关系清晰，织物细节仍待史实审核。',
  'gb-jlfw': '冠体、点翠色彩、珠宝层级与垂饰完整，展柜干扰已清除；龙凤数量和细部仍待权威资料复核。',
  'gb-syz': '方尊、四羊首、外撇口沿与主要纹带关系清晰；细部纹样和构件数量仍待史实审核。',
  'hb-cxd': '依据河北权威文博页面完整图生成；跪姿、持灯结构、导烟袖管与鎏金残损语义清晰。',
  'gg-jgyg': '杯体、双耳、三象首足、金胎与珠宝层级通过；为避免伪铭文，卡片口沿采用无字素蓝带，真实铭文仅以详情来源图为准。',
  'hn-fhxz': '鸮尊完整器形、盖体、翼纹、双足与尾撑关系清晰；纹饰细节仍待权威资料复核。',
  'hn-jhg': '骨笛单体、两端残损、自然弯曲、材质与七孔数量通过；孔位精确尺度仍以原始详情图为准。',
  'hn-lhfh': '方壶完整器形、莲瓣冠、中央立鹤、双侧龙形构件、足座与斑驳铜锈层级通过；复杂纹饰仍待权威资料复核。',
  'jdz-qhmb': '梅瓶口颈、丰肩、收腹轮廓及凤鸟、牡丹与分区纹饰层级通过；具体笔触与釉色仍以原始详情图为准。',
  'hlj-syj': '圆镜、中央钮、双鱼首尾环绕关系与暗色铜质通过；波纹和边饰细节仍以原始详情图为准。',
  'hlj-tzl': '坐龙单体、昂首、长前肢、坐姿与深色铜锈通过；低分辨率原图限制下的具体动物纹细节仍待复核。',
  'jz-yzj': '单剑完整轮廓、长刃、中脊、格、柄与首的比例通过；表面铭文未作重构。',
  'mo-klk': '青花盘完整器形、中心花鸟与放射式开光层级通过；各开光笔触细节仍以原始详情图为准。',
  'sb-qhbf': '凤首流、扁圆壶体、曲柄、圈足与青花凤鸟主体关系通过；具体笔触仍以原始详情图为准。',
  'sh-dkd': '大克鼎双立耳、圆腹、三足、扉棱和主要纹带关系通过；铭文与细部纹饰未作重构。',
  'sxd-hjm': '青铜头像、金面罩覆盖关系、突出双耳、眼鼻口轮廓与金铜材质层级通过；残损边缘仍以原始详情图为准。',
  'sxd-zym': '纵目面具双筒形眼、宽耳、额部开孔、鼻口与面壳残边关系通过；未添加头颈或幻想构件。',
  'sxl-hzx': '小型方形玉印、虎钮、乳白玉质与侧边卷云纹通过；印面文字未展示、未补造。',
  'sxl-yjb': '金碗敞口、矮圈足、莲瓣开光、鸟纹与錾刻层级通过；金色保留旧器哑光质感。',
  'yn-jcn': '金翅鸟头、双翼、双足、火焰形背饰与珠饰关系通过；透明展托已移除，细部仍以原始详情图为准。',
  'zj-yzj': '两件独立剑具的数量、平行陈列、盘形首与一深一绿铜锈差异通过；未补造鸟虫书铭文。',
  'nm-jgs': '鹰形冠饰、环形冠带、动物纹牌与小型玉石构件关系通过；去除蓝色展垫后未添加佩戴者或额外宝石。',
  'sxd-dlr': '大立人高冠、面部、双手空握、长袍、双足及分层台座完整关系通过；手中未补造器物。',
  'sxl-lt': '骆驼完整四足、昂首、鞍毯与五名可见人物数量通过；人物动作细节仍以原始详情图为准。',
  'kf-khc': '尖拱形背屏、中央立佛、左右二胁侍、足部残损与题记座关系通过；未补造可读题记。',
  'cq-wyq': '单阙、微收石柱、叠涩阙楼、出檐与现存浮雕构件关系通过；未补造成对阙或题刻。',
  'dz-qsg': '千手观音中央主尊、石窟壁面属性与密集残存手臂场关系通过；画面采用建筑性裁切，未拆分为独立造像。',
  'sxd-qs': '神树中央干、三层主要枝组、鸟、垂饰、下部盘龙与环形底座关系通过；未添加真实树叶或额外层级。',
  'sz-bz': '宝幢八角基座、群像云山层、柱身、垂饰华盖与细长刹顶完整层级通过；未改造成建筑尺度宝塔。',
  'nb-wgj': '万工轿完整轿体、密集雕刻层级、红金材质、垂饰及前部轿杠关系通过；未添加人物或仪仗场景。',
  'tb-xjhl': '《雪景寒林图》中央山体、寒林、亭屋、远峰与旧绢色调关系通过；AI图仅作卡片展示，详情继续使用原始来源图。',
  'zj-fcst': '《剩山图》横卷中央山水段、纸色、墨色与卷轴展示关系通过；未生成边跋文字，详情继续使用原始来源图。',
  'sh-sqf': '依据上海博物馆官方本体图生成；浅长方槽体、单侧中空短柄、低壁比例与多色铜锈通过，铭文仅保留不可读刻痕语义。',
};

const sourceOverrides = {
  'hb-cxd': {
    src: '/artifact-sources/official/hb-cxd.png',
    credit: '旅图河北：西汉长信宫灯 · 河北博物院藏',
    sourceUrl: 'https://lthb.hebeimedia.cn/c/2022-07-20/563282.html',
    institution: '河北博物院 / 河北新闻网旅图河北',
  },
  'sh-sqf': {
    src: '/artifact-sources/official/sh-sqf.jpg',
    credit: '上海博物馆：战国商鞅方升',
    sourceUrl: 'https://www.shanghaimuseum.net/mu/frontend/pg/m/article/id/CI00000346',
    institution: '上海博物馆',
  },
};

for (const item of manifest.items) {
  const outputPath = path.join(root, item.output);
  try {
    await access(outputPath);
  } catch {
    if (availableOnly) {
      skipped.push(item.id);
      continue;
    }
    throw new Error(`Missing generated output: ${item.output}`);
  }

  const record = images[item.id];
  if (!record) throw new Error(`Missing image record: ${item.id}`);
  const sourceOverride = sourceOverrides[item.id];
  if (sourceOverride) {
    record.src = sourceOverride.src;
    record.credit = sourceOverride.credit;
    delete record.ai;
  }
  const legacy = { src: record.src, credit: record.credit };
  const reused = item.mode === 'reuse-candidate';
  const visualNote = approvedVisualNotes[item.id];

  record.variants = {
    card: {
      src: `/${item.output.replace(/^public\//, '').replaceAll('\\', '/')}`,
      kind: 'ai',
      fit: 'cover',
      credit: 'AI 生成示意 · 基于真实来源图统一展陈',
      provenance: {
        type: 'ai',
        generator: reused ? '既有 AI 风格样片（生成器待补证）' : 'OpenAI image generation',
        promptVersion: manifest.version,
        promptManifest: 'assets/artifact-image-prompts/p2-source-2026-08-27.json',
        generatedAt: reused ? 'unknown' : '2026-08-27',
        references: [{
          type: 'local-archive',
          value: legacy.src,
          credit: legacy.credit,
        }],
      },
      review: {
        visual: visualNote ? 'approved' : 'pending',
        historical: 'pending',
        reviewedAt: visualNote ? '2026-08-27' : undefined,
        reviewedBy: visualNote ? 'Codex visual QA' : undefined,
        note: visualNote
          ?? '生成资产已登记；需完成接触表视觉审核与权威资料史实审核。',
      },
    },
    detail: {
      src: legacy.src,
      kind: 'source',
      fit: 'contain',
      credit: legacy.credit,
      provenance: sourceOverride
        ? {
            type: 'source',
            sourceUrl: sourceOverride.sourceUrl,
            institution: sourceOverride.institution,
            verifiedAt: '2026-08-27',
            linkCheckedAt: '2026-09-15',
            authorizationStatus: 'pending',
          }
        : { type: 'source', authorizationStatus: 'pending' },
      review: {
        visual: 'approved',
        historical: sourceOverride ? 'approved' : 'pending',
        reviewedAt: '2026-08-27',
        reviewedBy: 'Codex source QA',
        note: sourceOverride
          ? '权威文博页面完整图，用于保存器物真实结构与比例；页面版权与再利用许可仍需单独核验。'
          : '保留原始来源图作为详情与史实参考；来源页、作者/机构与许可字段仍待补充核验。',
      },
    },
  };
  registered.push(item.id);
}

const latest = JSON.parse(await readFile(imagesPath, 'utf8'));
for (const [id, record] of Object.entries(latest)) {
  if (record.sourceReview) images[id] = record; // Never overwrite a later provenance review.
}
await writeFile(imagesPath, `${JSON.stringify(images, null, 2)}\n`, 'utf8');
console.log(`Registered ${registered.length} P2 source-card records.`);
if (skipped.length > 0) console.log(`Skipped ${skipped.length} outputs not yet generated.`);
