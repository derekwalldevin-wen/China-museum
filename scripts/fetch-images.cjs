// 改进版：Wikidata 多查询变体(中/英) + Commons 搜索，支持断点续抓
const { museums } = require('./m-lib.cjs');
const fs = require('fs');

const QUERY_OVERRIDE = {
  'gb-hmwd': ['后母戊鼎', 'Houmuwu Ding'], 'gg-jgyg': ['金瓯永固杯'], 'gg-gzdc': ['各种釉彩大瓶', '瓷母'],
  'hn-jhg': ['贾湖骨笛', 'Jiahu bone flute'], 'gs-tbm': ['铜奔马', 'Flying Horse of Gansu'],
  'hb-cxd': ['长信宫灯', 'Changxin Palace Lamp'], 'hb-jly': ['金缕玉衣 满城', 'jade burial suit Mancheng'],
  'hub-zhy': ['曾侯乙编钟', 'Bianzhong of Marquis Yi'], 'hub-ywj': ['越王勾践剑', 'Sword of Goujian'],
  'hun-ssd': ['素纱襌衣', 'plain gauze gown Mawangdui'], 'hun-tbh': ['T形帛画', 'Mawangdui silk painting'],
  'bj-hz': ['何尊', 'He Zun'], 'sxd-qs': ['青铜神树 三星堆', 'Sanxingdui bronze tree'],
  'sxd-dlr': ['青铜大立人', 'Sanxingdui bronze standing figure'], 'js-tysn': ['太阳神鸟', 'sunbird gold Jinsha'],
  'tp-cyb': ['翠玉白菜', 'Jadeite Cabbage'], 'tp-rxs': ['肉形石', 'Meat-shaped stone'],
  'tp-mgd': ['毛公鼎', 'Mao Gong Ding'], 'sh-dkd': ['大克鼎', 'Da Ke Ding'],
  'ny-wdx': ['文帝行玺', 'Nanyue King gold seal'], 'yn-dwy': ['滇王之印', 'King of Dian gold seal'],
  'sxl-xmb': ['镶金兽首玛瑙杯', 'agate cup beast head Hejiacun'], 'sxl-hzx': ['皇后之玺'],
  'gg-qmsh': ['清明上河图', 'Along the River During Qingming'], 'gg-qljs': ['千里江山图', 'A Thousand Li of Rivers'],
  'qs-tcm': ['铜车马 秦始皇帝陵', 'Qin bronze chariot'], 'qs-by': ['兵马俑 将军俑', 'Terracotta general'],
  'qs-gyz': ['跪射俑', 'kneeling archer terracotta'],
  'lb-zfsg': ['簪花仕女图', 'Court Ladies Adorning Their Hair with Flowers'],
  'zj-fcst': ['剩山图', 'Dwelling in the Fuchun Mountains'], 'nj-js': ['西汉金兽', 'Xuzhou gold beast'],
  'hn-fhxz': ['妇好鸮尊', 'Fu Hao owl zun'], 'hn-lhfh': ['莲鹤方壶', 'Lotus and Crane Square Pot'],
  'sx-nz': ['晋侯鸟尊', 'bird zun Jin'], 'yx-jg': ['甲骨文', 'oracle bone'],
  'hun-mfl': ['皿方罍', 'Min fang lei'], 'sd-acy': ['亚丑钺', 'Ya Chou yue axe'],
  'hub-zp': ['曾侯乙尊盘', 'zun pan Marquis Yi'], 'hub-qj': ['睡虎地秦简', 'Shuihudi Qin slips'],
  'ny-sly': ['丝缕玉衣 南越王', 'Nanyue jade burial suit'], 'jx-qth': ['伏鸟双尾青铜虎', 'Dayangzhou bronze tiger'],
  'sz-lhw': ['秘色瓷莲花碗', 'mi se ci lotus bowl'], 'ly-byb': ['曹魏白玉杯', 'Cao Wei white jade cup'],
  'nm-jgs': ['匈奴金冠', 'Xiongnu gold crown'], 'xj-wxc': ['五星出东方利中国', 'Five stars rise in the east brocade'],
  'jl-efj': ['洞庭春色赋', 'Su Shi ode'], 'gg-pft': ['平复帖', 'Pingfu Tie'],
  'gb-jlfw': ['九龙九凤冠', 'phoenix crown Ming empress'], 'gb-hsyl': ['C形玉龙', 'Hongshan jade dragon'],
  'tb-xjhl': ['雪景寒林图', 'Snowy Forest Fan Kuan'], 'tb-tbd': ['太保鼎'],
  'ah-czd': ['铸客大鼎', 'Chu da ding'], 'nx-ljt': ['鎏金铜牛 西夏', 'Xixia gilt bronze ox'],
  'qh-wdw': ['舞蹈纹彩陶盆', 'dance pattern painted pottery basin'],
  'gb-syz': ['四羊方尊', 'Si Yang Fang Zun'], 'gb-jgs': ['击鼓说唱俑', 'storyteller figurine Han'],
  'sh-sqf': ['商鞅方升', 'Shang Yang square sheng'], 'nj-zlqx': ['竹林七贤砖画', 'Seven Sages brick relief'],
  'yn-nha': ['牛虎铜案', 'bronze cow tiger table'], 'gx-xlt': ['翔鹭纹铜鼓', 'bronze drum egret'],
  'sxl-wmh': ['舞马衔杯纹银壶', 'gilt silver ewer dancing horse'],
  'sxl-yjb': ['鸳鸯莲瓣纹金碗', 'Hejiacun gold bowl'],
  'sxl-lt': ['骆驼载乐俑', 'camel musicians sancai'], 'qzx-zyj': ['状元卷 赵秉忠'],
  'bj-lp': ['逨盘', 'Lai pan'], 'yx-sxd': ['司母辛鼎', 'Si Mu Xin ding'],
  'yx-yz': ['亚长牛尊', 'Yachang buffalo zun'], 'kf-tmj': ['开封府题名记碑'],
  'sz-bz': ['真珠舍利宝幢', 'pearl relic stupa Ruiguang'], 'jdz-cslh': ['无语佛 沉思罗汉', '沉思罗汉 景德镇'],
  'hub-sat': ['四爱图梅瓶'], 'dh-jsl': ['九色鹿 壁画', 'nine colored deer mural'],
  'dh-ft': ['敦煌 飞天 壁画', 'Dunhuang apsara mural'], 'dh-swk': ['莫高窟 第45窟', 'Mogao cave 45'],
  'zj-yzj': ['越王者旨於睗剑'], 'sx-hmms': ['侯马盟书'], 'xz-stg': ['卡若 双体陶罐'],
  'cq-nxz': ['鸟形尊', 'bird-shaped zun Ba'], 'cq-wyq': ['乌杨阙', 'Wuyang que'],
  'dz-qsg': ['大足 千手观音', 'Dazu thousand-armed Guanyin'],
  'js-hjm': ['金沙遗址 金面具', 'Jinsha gold mask'], 'sxd-hjm': ['三星堆 金面具', 'Sanxingdui gold mask'],
  'sxd-zym': ['纵目面具', 'protruding eyes mask Sanxingdui'], 'sxd-jz': ['三星堆 金杖', 'Sanxingdui gold sceptre'],
  'gz-tcm': ['东汉铜车马 兴义', 'Eastern Han bronze chariot Guizhou'],
  'hn-wzt': ['武则天金简', 'Wu Zetian gold slip'], 'ly-hym': ['三彩黑釉马', 'black sancai horse'],
  'nb-wgj': ['万工轿', 'Ningbo wedding sedan'], 'nb-yrjd': ['羽人竞渡纹铜钺'],
  'fj-jyz': ['建窑兔毫盏', 'Jian ware hare fur bowl'], 'fj-dhgy': ['何朝宗 观音', 'He Chaozong Guanyin'],
  'fj-kql': ['孔雀蓝釉陶瓶', 'peacock blue vase Liu Hua tomb'],
  'gd-mlt': ['陈容 墨龙图', 'Chen Rong dragon'], 'gd-dsk': ['潮州金漆木雕', 'Chaozhou gilt wood carving'],
  'qz-hzc': ['泉州湾 宋代沉船', 'Quanzhou ship'], 'dt-lbl': ['北魏 玻璃碗', 'Northern Wei glass bowl'],
  'sy-ljy': ['鹿角椅 沈阳故宫', 'antler chair Mukden'], 'tp-rsp': ['汝窑水仙盆', 'Ru ware narcissus basin'],
  'tp-kxs': ['快雪时晴帖', 'Kuaixue Shiqing'], 'hk-lsf': ['洛神赋图', 'Nymph of the Luo River'],
  'hk-hrz': ['定窑孩儿枕', 'Ding ware pillow child'], 'xj-fxnv': ['伏羲女娲图', 'Fuxi Nuwa painting Astana'],
  'xj-thy': ['天王踏鬼木俑', 'Astana lokapala wooden figurine'],
  'xz-byj': ['贝叶经', 'palm leaf manuscript'],
  'yn-jcn': ['金翅鸟 崇圣寺', '宋大理国金翅鸟', 'Garuda Dali'],
  'yx-jg': ['刻辞卜骨', 'oracle bone Yin Xu', 'Shang oracle bone'],
  'zj-fcst': ['富春山居图 剩山图', '剩山图 浙江省博物馆'],
  'zj-aywt': ['雷峰塔 阿育王塔', '鎏金银阿育王塔'],
  'yz-mb': ['霁蓝釉白龙纹梅瓶', '扬州博物馆 梅瓶', 'blue meiping white dragon Yangzhou'],
  'sxl-lt': ['唐三彩骆驼载乐俑', 'camel musicians Shaanxi History Museum', '三彩骆驼载乐俑'],
  'dt-lbl': ['北魏 玻璃碗 大同', 'Northern Wei blue glass bowl'],
  'jl-efj': ['洞庭春色赋 中山松醪赋', 'Su Shi Dongting'],
  'jl-wjg': ['文姬归汉图 张瑀', 'Wenji return Jin dynasty'],
  'jdz-blz': ['粉彩百鹿尊', 'hundred deer zun famille rose'], 'js-sjc': ['十节玉琮 金沙', 'cong jade Jinsha'],
  'mo-klk': ['克拉克瓷', 'kraak porcelain'], 'gz-yjg': ['播州 金凤冠'], 'ly-sbx': ['石辟邪 洛阳', 'stone bixie Luoyang'],
  'jl-wjg': ['文姬归汉图', 'Wenji returning'], 'jl-ljm': ['夫余 面具'], 'hlj-gys': ['桂叶形石器'],
  'hlj-syj': ['金代 双鱼铜镜'], 'tb-yhc': ['珐琅彩 玉壶春瓶 雉鸡'], 'sb-jd': ['堇鼎'], 'sb-bjl': ['伯矩鬲'],
  'sb-qhbf': ['青花凤首扁壶'], 'dz-jp': ['定窑 龙首净瓶'], 'dz-yzp': ['玉座屏 定州'],
  'dz-lgd': ['龙螭衔环玉璧'], 'dt-ytz': ['司马金龙墓 陶俑'], 'nm-jyx': ['小宋自造 香炉'],
  'nm-lsy': ['辽三彩 鸳鸯壶'], 'lb-gf': ['虢国夫人游春图', 'Lady Guoguo spring outing'],
  'lb-yzl': ['玉猪龙', 'Hongshan pig dragon'], 'sy-yyd': ['努尔哈赤 宝剑'], 'sy-wyc': ['沈阳故宫 粉彩'],
  'sh-syt': ['上虞帖', 'Shangyu Tie'], 'nj-mb': ['釉里红 梅瓶 洪武'], 'nj-frs': ['芙蓉石 蟠螭耳盖炉'],
  'yz-mb': ['霁蓝釉白龙纹梅瓶', 'blue glaze white dragon meiping'], 'yz-tj': ['打马球 铜镜'],
  'yz-zbq': ['郑板桥 兰竹'], 'zj-sncy': ['双鸟朝阳 牙雕', 'Hemudu ivory'],
  'zj-aywt': ['阿育王塔 吴越', 'Ashoka stupa Wuyue'], 'nb-hyz': ['越窑 荷叶盏托'],
  'ah-wgj': ['吴王光鉴'], 'ah-yqz': ['影青注子 温碗'], 'jx-smsr': ['双面神人青铜头像', 'Dayangzhou bronze head'],
  'jx-glc': ['青花釉里红 谷仓'], 'jdz-qhmb': ['元青花 牡丹 梅瓶'], 'jdz-blz': ['百鹿尊'],
  'sd-lgdy': ['鲁国大玉璧'], 'sd-hts': ['红陶兽形壶', 'Dawenkou red pottery'],
  'sd-szb': ['银雀山汉简', 'Yinqueshan bamboo slips'], 'kz-sg': ['商周十供'],
  'kz-myc': ['衍圣公 朝服'], 'kz-kzsj': ['孔子圣迹图'], 'qzx-lxsf': ['龙兴寺 佛造像', 'Qingzhou Buddhist statues'],
  'qzx-yzb': ['宜子孙 玉璧'], 'kf-dsb': ['大晟编钟'], 'kf-khc': ['孔惠超造像'],
  'jz-hnjg': ['虎座鸟架鼓', 'tiger phoenix drum'], 'jz-yzj': ['越王州句剑'], 'jz-lfh': ['马山 丝织品 战国'],
  'hun-dhd': ['人面纹方鼎', 'human face square ding'], 'cs-zml': ['走马楼吴简', 'Zoumalou Wu slips'],
  'cs-dhj': ['五一广场 东汉简牍'], 'gd-qjy': ['端砚 千金猴王砚'], 'ny-jyb': ['角形玉杯 南越王', 'jade rhyton Nanyue'],
  'gx-yfd': ['铜凤灯 合浦'], 'gx-qht': ['漆绘提梁铜筒'], 'hain-hgj': ['华光礁 沉船'],
  'hain-lj': ['黎锦 龙被'], 'hain-hhl': ['黄花梨 圈椅'], 'cq-hty': ['唐寅 夜宴图'],
  'dz-zlj': ['大足 转轮经藏窟'], 'dz-mnt': ['大足 牧牛图'], 'sc-xsel': ['象首耳 铜罍'],
  'sc-ssj': ['后蜀石经'], 'sc-hxz': ['制盐画像砖'], 'gz-myg': ['苗族银冠'],
  'yn-nha2': ['牛虎铜案'], 'xa-scm': ['三彩腾空马'], 'xa-dqz': ['董钦造像'],
  'xa-snt': ['唐仕女俑'], 'bj-hg': ['㝬簋', 'Hu gui'], 'gs-rts': ['人头形器口彩陶瓶', 'Dadiwan pottery'],
  'gs-yxt': ['驿使图画像砖', 'post rider brick Jiayuguan'], 'qh-gyq': ['归义亲汉长 铜印'],
  'qh-tk': ['热贡 唐卡', 'thangka'], 'nx-jxb': ['西夏 木活字 佛经', 'Xixia wooden movable type'],
  'nx-hxw': ['胡旋舞 墓门', 'Sogdian whirl tomb door'], 'hk-jgb': ['雍正 青花'], 'mo-wxh': ['外销画 通草画', 'pith painting'],
  'qz-jc': ['军持 磁灶窑'], 'qz-mbs': ['泉州 阿拉伯 墓碑', 'Quanzhou arabic tombstone'],
};

const UA = { headers: { 'User-Agent': 'MuseumAtlas/1.0 (personal project)' } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function viaWikidata(q) {
  try {
    const s = await fetch('https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=zh&limit=3&search=' + encodeURIComponent(q), { ...UA, signal: AbortSignal.timeout(6000) });
    const sj = await s.json();
    for (const e of sj.search || []) {
      const c = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&property=P18&entity=${e.id}`, { ...UA, signal: AbortSignal.timeout(6000) });
      const cj = await c.json();
      const img = cj.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (img && !/\.(svg|tif|ogg)$/i.test(img)) {
        return { url: 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(img) + '?width=900', title: img, via: 'wikidata', q };
      }
    }
  } catch { /* ignore */ }
  return null;
}

async function viaCommons(q) {
  try {
    const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*'
      + '&generator=search&gsrlimit=4&gsrnamespace=6'
      + '&prop=imageinfo&iiprop=url%7Csize%7Cmime&iiurlwidth=900&gsrsearch=' + encodeURIComponent(q);
    const res = await fetch(url, { ...UA, signal: AbortSignal.timeout(6000) });
    const json = await res.json();
    for (const p of Object.values(json.query?.pages || {})) {
      const info = p.imageinfo?.[0];
      if (info && ['image/jpeg', 'image/png'].includes(info.mime) && info.width >= 350) {
        return { url: (info.thumburl || info.url).split('?utm_')[0], title: p.title, via: 'commons', q };
      }
    }
  } catch { /* ignore */ }
  return null;
}

(async () => {
  const out = fs.existsSync('src/data/images.json')
    ? JSON.parse(fs.readFileSync('src/data/images.json', 'utf8')) : {};
  let done = 0, hit = 0, skipped = 0;
  const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const m of museums) {
    for (const a of m.artifacts) {
      if (ONLY && !ONLY.includes(a.id)) continue;
      if (out[a.id]) { skipped++; continue; }
      const variants = QUERY_OVERRIDE[a.id]
        || [a.name.replace(/[《》·（）()]/g, ' ').trim(), a.name.replace(/^(西周|商代|战国|春秋|东汉|西汉|北宋|南宋|唐代|唐|明代|明|清代|清|元代|元|五代|南朝|北魏|北齐|曹魏|西夏|辽|金代|金|新石器时代|隋代|隋|三国|西晋|东晋|吐蕃|当代|现代|清末|民国)/, '').replace(/[《》·（）()]/g, ' ').trim()];
      let r = null;
      for (const q of variants) {
        r = (await viaWikidata(q)) || (await viaCommons(q));
        if (r) break;
        await sleep(80);
      }
      if (r) { out[a.id] = { url: r.url, title: r.title, via: r.via }; hit++; }
      done++;
      if (done % 15 === 0) {
        fs.writeFileSync('src/data/images.json', JSON.stringify(out, null, 1));
        console.log(`new=${done} hit=${hit} covered=${Object.keys(out).length}`);
      }
      await sleep(80);
    }
  }
  fs.writeFileSync('src/data/images.json', JSON.stringify(out, null, 1));
  console.log(`DONE covered=${Object.keys(out).length}`);
})();
