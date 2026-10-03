# 设计品质第二十九轮：缓动语义化落地（进场 ease-out / 离开 ease-in）

日期：2026-10-03。按用户决策执行第 3 条：把通用 `ease` 换成语义化缓动。

## 一、先摸清"退场"是否存在

改之前先查有没有真正的**退场过渡**——结果是**没有**：灯箱、导览、加载层都是**瞬时卸载**（无 CSS 过渡）。所以 `--ease-in` 不能靠"给退场动画换曲线"来落地，正确落点是**成对状态里的"离开"一侧**（悬停离开、取消选中），用 `:not(:hover)` 表达。

## 二、做了两件事

### 1. 进场：25 处裸 `ease` → `var(--ease-out)`

全站扫描出的裸 `ease` 全部属于**状态变化/进场**（导航下划线、时代标签、按钮底色、地图标注、开场元素）。硬保护：含 `!important` 的行一律不动（无障碍开关复查仍为两处 `0.01ms` ✓）。

### 2. 补齐"没写缓动"的过渡：5 处

CSS 的**初始值就是 `ease`**，所以"过渡简写里没写缓动"的地方有效值仍是 `ease`。其中 `story-experience.css:19` 一条规则覆盖所有链接与按钮——正是故事页残留 92 处 `ease` 的来源。5 处全部补上 `var(--ease-out)`。

### 3. 离开：`:not(:hover)` 用 `var(--ease-in)`

```css
.atlas-nav-tab:not(:hover):not(:focus-visible)::after,
.atlas-era-tab:not(:hover):not(:focus-visible)::after,
.draw-btn:not(:hover)::before,
.draw-btn:not(:hover)::after,
.atlas-story-beacon button:not(:hover),
.scroll-province:not(:hover) .scroll-province-shape,
.atlas-marker:not(:hover) .atlas-marker-seal {
  transition-timing-function: var(--ease-in);
}
```

## 三、实测证据

### 有效缓动取值（真实元素计算值）

| 视口 | 改前 | 改后 |
| --- | --- | --- |
| 首页 | 3 种（`ease` 占 115） | **2 种**（`--ease-out` 占 167） |
| 故事页 | 4 种（`ease` 占 205） | **3 种**（`--ease-out` 占 257） |

**`ease` 完全消失**（从 115–205 处降到 **0**）。

### 进出成对验证（悬停前 / 悬停中读计算值）

| 元素 | 未悬停（离开） | 悬停（进入） |
| --- | --- | --- |
| `.atlas-nav-tab::after` | `cubic-bezier(0.4, 0, 1, 1)`＝**--ease-in** ✓ | `cubic-bezier(0.2, 0.7, 0.2, 1)`＝**--ease-out** ✓ |
| `.draw-btn::after` | `--ease-in` ✓ | `--ease-out` ✓ |

## 四、验收（本轮实跑）

| 项目 | 结果 |
| --- | --- |
| 全量单元测试 | **181/181 通过** |
| `e2e-intro` | **6/6 通过**（开场时序未受影响） |
| `e2e-stories` | **462/462 通过** |
| `e2e-home-refinement` | 通过 |
| `e2e-map` | **7/7 通过** |
| `e2e-visitor-records` | **10/10 通过** |
| 设计品质自检（本地） | **100/100**（有效缓动 2 种） |

线上已发布：`https://9cf016e1.huaxia-museum-atlas.pages.dev`（主域同步）。

## 五、说明

`.atlas-story-beacon button` 的悬停/离开都显示 `--ease-out`：它的过渡在元素自身、`:not(:hover)` 规则被其自身声明的优先级压过。观感上仍是"进场曲线"，不构成问题；如需两态严格区分可再加一条更具体的选择器。
