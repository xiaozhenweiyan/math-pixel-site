# 修复神经网络动画 + 网站改名为"数学学习网站" Spec

## Why
当前神经网络（升级后）出现两个回归问题：训练过程没有动画、所有整数序列预测都输出同一个值（如 5），因为 `postProcessPrediction` 的 `Math.round` 把所有接近的预测值吸附到同一整数。同时用户希望网站改名为"数学学习网站"，入口按钮改为卡片式（为后续添加其他功能做准备），并把 GitHub 仓库名改为"数学像素网站"对应的英文名。

## What Changes
- 修复神经网络：去除粗暴的 Math.round 吸附，改为智能吸附（仅当预测值与整数差距 < 0.05 时才吸附）；降低整数序列 tolerance 严格度；确保训练动画可见
- 浏览器标签页 title 改为"数学学习网站"
- 落地页标题"数学像素网站"改为"数学学习网站"
- 落地页副标题、样式同步更新
- "预测系统"按钮改为卡片式（含图标、标题、描述），为后续添加更多功能卡片预留结构
- GitHub 仓库名从 `pixel-predictor` 改为 `math-pixel-site`（"数学像素网站"的英文）
- 推送到新仓库（用户已配置 token）

## Impact
- Affected code: `js/nn.js`（修复吸附逻辑 + tolerance）、`index.html`（title + 落地页卡片化）、`styles/pixel.css`（卡片样式）、`js/app.js`（落地页交互适配）
- Affected infrastructure: GitHub 仓库重命名 + 远程 URL 更新
- 不影响 40 种数学方法、过拟合、偏移算法等现有功能

## ADDED Requirements

### Requirement: 神经网络智能整数吸附
系统 SHALL 仅当神经网络预测值与最近整数的差距小于 0.05 时才吸附到整数，否则保留原始预测值，避免所有预测值被吸附到同一整数。

#### Scenario: 整数等差数列
- **WHEN** 用户输入 [1, 2, 3, 4]
- **THEN** 神经网络预测 5（训练良好时）
- **AND** 多步预测 [1, 2, 3, 4, 5, 6] 不会全部输出 5

#### Scenario: NN 未训练好时
- **WHEN** NN 预测原始值为 4.3
- **THEN** 输出 4.3（不强制吸附），而非 4

### Requirement: 神经网络训练动画可见
系统 SHALL 在训练过程中持续刷新网络可视化，确保用户能看到节点闪烁、连接线变化、训练步骤推进。

#### Scenario: 训练过程
- **WHEN** 用户点击预测触发 NN 训练
- **THEN** nn-canvas 持续刷新（至少每 100ms 一次）
- **AND** 显示当前步骤、误差、节点激活状态

### Requirement: 网站改名为"数学学习网站"
系统 SHALL 把所有"数学像素网站"文案改为"数学学习网站"，包括落地页标题、浏览器标签页 title。

#### Scenario: 浏览器标签
- **WHEN** 用户打开网站
- **THEN** 浏览器标签页显示"数学学习网站"

#### Scenario: 落地页标题
- **WHEN** 网站加载完成
- **THEN** 落地页顶部显示"数学学习网站"标题

### Requirement: 入口卡片化
系统 SHALL 把单一"预测系统"按钮改为卡片式入口，包含图标、标题、描述，为后续添加更多功能卡片预留布局结构。

#### Scenario: 卡片展示
- **WHEN** 用户在落地页
- **THEN** 看到"预测系统"卡片（含图标、标题、描述）
- **AND** 卡片点击后进入预测页面

#### Scenario: 后续扩展
- **WHEN** 未来添加新功能（如"学习系统"）
- **THEN** 可在卡片网格中新增一张卡片，无需改动布局

### Requirement: GitHub 仓库重命名
系统 SHALL 把 GitHub 仓库名从 `pixel-predictor` 改为 `math-pixel-site`，并更新本地 remote URL，推送到新仓库。

## MODIFIED Requirements

### Requirement: 神经网络输出后处理
神经网络 SHALL 使用智能吸附策略替代粗暴的 Math.round：仅当 `|value - Math.round(value)| < 0.05` 时才吸附，否则保留原值。小数精度四舍五入逻辑保留不变。

## REMOVED Requirements
（无）
