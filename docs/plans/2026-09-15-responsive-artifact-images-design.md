# 191件文物响应式图片传输设计

日期：2026-09-15

## 数据和派生

`images.json`及现有解析函数继续决定哪个card/detail能够展示。离线脚本遍历191件文物，只收集当前解析结果中的primary与合法legacy fallback；hold、restricted、rejected和retired资源不会进入任务集。每个唯一原文件按SHA-256去重，生成WebP到独立目录，绝不覆盖原文件。

card使用240、400、640、960像素宽度候选，普通detail使用480、800、1200、1600候选；所有候选宽度不超过原宽，并补一个不超过角色上限的最大有效宽度。长卷detail不调整宽高，只做高质量WebP转码，因此阅卷可用像素范围不会减少。所有处理固定为EXIF方向归一化、Lanczos等比缩放、无裁切、无补绘、无AI、保留透明通道；证据清单保存输入输出尺寸、字节和SHA-256。

## 前端和回退

安全card清单附带其primary/fallback的最小delivery候选；按馆详情JSON附带当前馆detail资源的delivery映射。通用图片组件输出`picture`、WebP `source/srcset/sizes`与原格式`img src`。不支持WebP的浏览器原生忽略source。若浏览器支持但WebP网络失败，组件先禁用source重试同一原图；原图也失败后才调用既有图片hook，按原有顺序切换legacy或线刻。

card的`sizes`匹配现有1/2/4/5列布局；普通详情按手机可视宽度和桌面展签宽度选择；长卷只提供同尺寸WebP，不让浏览器选择缩水副本。

## 测试与回滚

测试覆盖191件归属、全部可展示角色、文件存在、解码、比例、无放大、输入/输出哈希、hold/restricted/retired排除、AI/source kind不变、23件长卷像素边界，以及WebP失败→同图原格式→既有语义回退。无头浏览器分别测桌面、手机、弱网、直接URL和长卷触控，并记录图片请求/传输字节变化。

回滚只需移除响应式清单引用和派生目录；原图片、`images.json`、授权字段和旧处理链完全保留。
