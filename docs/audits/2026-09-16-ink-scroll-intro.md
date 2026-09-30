# 「一纸启封」Three.js 开场实施报告

日期：2026-09-16  
范围：本地生产候选，不发布 Cloudflare 线上站点

## 实际完成

- 首页无 query/hash 的首次 `navigate` 显示静态宣纸首帧；会话已看、刷新/前进后退及所有业务深链接直接跳过。
- Save-Data、slow-2g/2g/3g、低内存/低核心、已知低电量未充电、减少动态效果及无 WebGL2 环境使用静态替代。
- Three.js 独立动态加载，使用一个 `PlaneGeometry` 和程序化 shader；无图片、纹理、模型、后处理或新增字体请求。
- 2.8 秒分镜为宣纸、墨迹、玉璧/瓶/鼎负形、朱印、二维地图揭幕。地图在遮罩下继续按既有策略加载。
- 右上角 44px 跳过按钮、Escape、页面隐藏、业务导航、动态偏好变化及 3.3 秒墙钟上限都能结束开场。
- 退出会取消 RAF/计时器/监听/ResizeObserver，dispose geometry、material、renderer、renderLists，主动丢失 WebGL context 并移除 canvas。

## 资源预算

| 项目 | 改动前 | 当前 | 结论 |
|---|---:|---:|---|
| 入口 JS | 317.39 kB / gzip 101.00 kB | 324.18 kB / gzip 103.62 kB | gzip +2.62 kB，低于 +3 KiB 目标 |
| 开场动态块 | 无 | 508.98 kB / gzip 129.21 kB | 低于 180 KiB 目标及 200 KiB 硬上限 |
| 开场图片/字体 | 0 | 0 | 符合预算 |
| 390px 故宫首屏 | 2 张 / 37,140 B | 2 张 / 37,140 B | 无回归 |

手机实测 WebGL 画布 166,408 像素，低于 600,000 上限；桌面布局最大约 684,400 像素，低于 1,500,000 上限。

## 性能测量

结果文件：`docs/audits/ink-intro-performance.json`

- 受控准备延迟：513.4ms 标记准备超时并切换静态，无 canvas。
- 本地缓存可用路径：静态壳 153.6ms；WebGL 310.8ms；地图 695.1ms；完整退出 3,070.5ms。
- 分镜跳过：33.6ms 移除覆盖层，随后 canvas 数量为 0。

本地服务器不等同公网 CDN，因此这些数值用于验证预算、截止和生命周期，不把它们表述为线上加载承诺。

## 验收结果

- 全部静态/数据测试：62/62。
- 开场专项：5/5（桌面5帧、手机4帧、静态替代、会话跳过、业务深链接和2图守卫）。
- 完整桌面/手机业务交互：25/25。
- 390px图片请求调度：7/7。
- 二维地图与34省点击、港澳触控：7/7。
- TypeScript、定向 ESLint、生产构建通过。

完整 `npm run lint` 因工作区既有 `contest/tools/imageio_ffmpeg` 目录返回 EPERM 而无法完成目录遍历；显式覆盖全部 `src` 和本轮改动脚本后无诊断。这不是应用构建或运行错误。

## 证据

- 桌面/手机分镜：`docs/audits/ink-intro-browser/local/`
- 专项结果：`docs/audits/ink-intro-browser/local/results.json`
- 性能数据：`docs/audits/ink-intro-performance.json`
- 冻结设计：`docs/plans/2026-09-16-ink-scroll-intro-design.md`

本地预览：`http://127.0.0.1:4173/`
