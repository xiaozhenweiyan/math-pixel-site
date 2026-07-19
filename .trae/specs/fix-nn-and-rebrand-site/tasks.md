# Tasks

- [ ] Task 1: 修复神经网络吸附逻辑和动画 (nn.js)
  - [ ] SubTask 1.1: 修改 `postProcessPrediction`，整数序列仅当 `|value - round(value)| < 0.05` 时才吸附，否则保留原值
  - [ ] SubTask 1.2: 把 `computeAdaptiveTolerance` 中整数序列的 tolerance 从 0.01 改为 0.05（避免训练卡死）
  - [ ] SubTask 1.3: 在 `frameWrapper` 中确保每帧都调用 `drawNetwork`，动画始终可见
  - [ ] SubTask 1.4: 降低 `epochsPerFrame` 从 10 改为 5（让动画更流畅）
  - [ ] SubTask 1.5: 验证 [1,2,3,4] 多步预测不会全部输出 5

- [ ] Task 2: 网站改名 + 标签页 + 卡片化 (index.html + pixel.css + app.js)
  - [ ] SubTask 2.1: index.html `<title>` 改为"数学学习网站"
  - [ ] SubTask 2.2: 落地页标题"数学像素网站"改为"数学学习网站"
  - [ ] SubTask 2.3: 落地页副标题同步更新（如 "MATH LEARNING SITE"）
  - [ ] SubTask 2.4: 把"预测系统"按钮改为卡片式（含图标、标题、描述），用网格布局
  - [ ] SubTask 2.5: pixel.css 添加卡片样式（hover 效果、像素风图标）
  - [ ] SubTask 2.6: app.js 中卡片点击逻辑（沿用原 initLandingPage，适配新 DOM）

- [ ] Task 3: GitHub 仓库重命名 + 推送
  - [ ] SubTask 3.1: 用 gh CLI 或 API 把 `pixel-predictor` 重命名为 `math-pixel-site`
  - [ ] SubTask 3.2: 更新本地 git remote origin URL 为新仓库地址
  - [ ] SubTask 3.3: 推送到新仓库 main + gh-pages 分支
  - [ ] SubTask 3.4: 验证 https://xiaozhenweiyan.github.io/math-pixel-site/ 可访问

# Task Dependencies
- [Task 2] 独立于 [Task 1]，可并行
- [Task 3] depends on [Task 1], [Task 2]
