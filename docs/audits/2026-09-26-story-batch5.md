# 第五批独立故事与证据边界（2026-09-26）

## 范围

新增商鞅方升、河南博物院藏妇好鸮尊、云纹铜禁、皿方罍、浙江省博物馆《剩山图》五篇独立故事。每篇四章、三处细节、亲子思考题和至少两条带明确比较理由的关联。对原馆藏摘要做事实纠偏；不改图片、AI披露、授权与长卷选图。共36/201件分层故事、103条文字来源；仍有165件未成篇。

## 逐件直接依据与边界

| 藏品 | 本轮可核依据 | 不写成事实的内容 |
| --- | --- | --- |
| 商鞅方升 | [上海博物馆专题](https://www.shanghaimuseum.net/mu/show/202411/4335e32d-3cce-4602-955b-17ed7e0b9e59/)的容量、秦孝公十八年与秦始皇二十六年两次刻铭、后来的龚氏收藏 | 齐使来聘必然为协商量制；一器能证明全国执行程度；逐件修复工序 |
| 河南妇好鸮尊 | [河南博物院逐件页](https://www.chnmus.net/ch/collection/treasure/details.html?id=508163196212274341)的46.3厘米、16千克、妇好墓和铭文；[传统修复专题](https://www.chnmus.net/ch/special/preservation/index.html?id=102)的阶段照片 | 把国博另一件的尺寸与照片移入；“战神”当铭文；精确补配比例和修复日期 |
| 云纹铜禁 | [河南馆方技术研究](https://www.chnmus.net/sitesources/hnsbwy/page_pc/dzjp/mzyp/ywtj/list1.html)明确列出失蜡判断及反对意见；[修复者访谈](https://www.chnmus.net/sitesources/hnsbwy/page_pc/wbzx/yndt/article06b050e70a7c48cfb546e6e22b503059.html)给1981/1984节点 | 失蜡无争议、确切修复工期；将同篇天津夔纹铜禁史误入河南器 |
| 皿方罍 | [湖南博物院展品记录](https://www.hnmuseum.com/ko/gallery/node/9984/4)、[省文物局刊发采访](https://wwj.hunan.gov.cn/c100310/c100313/201406/t20140626_10495274.html)、[展览消息](https://wwj.hunan.gov.cn/c100310/c100350/201411/t20141118_10483377.html) | 1919精确出土地点没有争议；2014在拍卖场竞得；合璧等于金属焊接 |
| 《剩山图》 | [浙博展品记录](https://www.zhejiangmuseum.com/topic/hsyqf/collection-detail02.html)的尺寸、火痕和笔法；[档案部门转载文](https://www.yfyunchengqu.gov.cn/dag/zdht/sy/gzdt/content/post_425143.html)的征集与同展；[当年展讯](https://www.bjstb.gov.cn/bjtb/jljw/jtgcs/1307812/index.html) | 火痕直接证明投火者与动机；2011实物接成一卷；借展修裱技术细节 |

湖南与浙江的馆方展品页在网页直开时返回错误，只能核读检索索引摘录，因此来源记录标记 `search-text`，并在 `supports` 说明边界。省文物局刊发的是媒体采访，不是原始发掘报告；档案部门转载是后述，不当原始征集档案。全部来源只支持文字，不推定图片许可。

## 验证

- `node --test scripts/*.test.mjs`：78/78，通过。首次运行在重新生成馆数据前有4项派生缓存失配；`npm run generate:data` 后全绿，未修改测试断言以绕过。
- `npm run build`：受控权限构建通过。沙箱内Vite读父目录失败是环境权限，非源码错误。主包325.73 kB / gzip104.18 kB；故事块212.06 kB / gzip79.37 kB。故事块相对前轮186.26 kB / gzip69.38 kB增加25.80 kB / gzip9.99 kB；正文仍按需加载，不进入主包。
- `scripts/e2e-story-batch5.mjs`：1440px桌面、390px手机各五篇，URL直达、四章三细节、来源链接、无横向溢出；皿方罍→四羊方尊关联、筛选保留、浏览器后退和阅读位置恢复，12/12通过，页面错误0。
- 未对现有线上网站发布。本地预览 `http://127.0.0.1:4174/`。

## 下一步

继续按有逐件馆藏资料的器物分批补全剩余165篇，同时逐件核实约99件待新增藏品的真实归属。正式上线应在整体验收之后，图片授权边界独立审查。
