# 正式部署说明

## 公网地址

- 正式站点：<https://huaxia-museum-atlas.pages.dev/>
- 托管平台：Cloudflare Pages
- 状态：已发布，HTTPS 与公网访问验证通过

## 后续手动更新方式

1. 本地执行 `npm run build`。
2. 将 `dist/` 整个文件夹拖到 Netlify Drop 或上传到任意静态主机。
3. 打开生成的 URL，检查首页、香港入口和任一文物详情。
4. 把公开 URL 粘贴到 `SUBMISSION.md` 的体验链接占位处。

## Vercel / Netlify 仓库部署

- Build command：`npm run build`
- Output directory：`dist`
- Node：建议 20 或更高
- 项目已包含 `vercel.json` 与 `netlify.toml`

## 发布状态

- ESLint：通过
- TypeScript + Vite 生产构建：通过
- 资源完整性：191/191 文物都有映射与可解码图片
- 桌面与 390×844 手机：通过
- 港澳触控、进省、进馆、URL 导航：通过

## 公开发布注意

当前 191 件文物均有可用图像，61 条已迁移到新版图像机制；图片溯源字段仍有一部分待后续补全。参赛演示可以正常使用，但若做长期公开运营，建议继续完成第三方图片授权与来源字段复核。
