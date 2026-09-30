# 华夏博物志 · 中国博物馆手卷舆图

一个以二维中国画手卷为入口的全国博物馆数字展览。项目把真实省级边界、59 座博物馆与 191 件代表文物组织在同一条浏览链路中：展开舆图 → 选择省份 → 进入博物馆 → 阅读文物与长卷。

## 项目亮点

- 原生 SVG 绘制真实省界，以《禹迹图》《坤舆万国全图》和清代省域舆图为视觉参考。
- 桌面与移动端自适应；港澳设置独立引线和扩大的触控热区。
- 支持全国目录、馆藏/文物搜索、朝代与类别筛选、URL 直达和浏览器前进后退。
- 长卷类文物使用独立阅卷台，可横向拖动、键盘阅览并显示阅读进度。
- 图片数据支持官方来源、AI 重制稿、卡片/详情双版本与溯源字段。
- 首页使用原生 SVG + CSS，不依赖 WebGL，适合低性能设备。

## 本地运行

```bash
npm install
npm run dev
```

访问 Vite 输出的本地地址即可。

## 生产构建

```bash
npm run lint
npm run build
npm run preview
```

构建结果位于 `dist/`。这是纯静态站点，可直接部署到 Netlify、Vercel、Cloudflare Pages、GitHub Pages 或任意静态文件服务器。

## 快速部署

### Netlify

将仓库连接至 Netlify，构建命令使用 `npm run build`，发布目录使用 `dist`。项目已包含 `netlify.toml`。

### Vercel

导入仓库即可，框架选择 Vite。项目已包含 `vercel.json`，输出目录为 `dist`。

### 直接上传

执行 `npm run build` 后，把 `dist/` 内全部文件上传到静态主机根目录。`vite.config.ts` 使用相对资源路径，因此也可部署在子目录。

## 主要目录

- `src/components/ScrollMapScene.tsx`：二维手卷交互地图
- `src/components/MuseumDetail.tsx`：博物馆与文物展厅
- `src/data/`：博物馆、文物、图片和省界数据
- `public/artifacts*`：文物图像资产
- `docs/audits/`：文物与图片资产审计
- `contest/`：VibeLab 参赛视频、静帧、文案和投稿说明

## 内容说明

本项目用于文化展示与交互设计演示。文物图片的来源与生成方式按项目数据模型记录；正式公开发布时，应继续保留相应来源说明，并对第三方图片的授权状态做最终确认。
