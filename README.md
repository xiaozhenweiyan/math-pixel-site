# 像素风格工具网站 / Pixel Tools

> 复古像素风工具集合网站 · Pixel-style retro tools collection
>
> 部署地址 / Deploy: https://xiaozhenweiyan.github.io/pixel-tools/

## 简介 / Introduction

像素风格工具网站是一个复古深空像素风的工具集合站点，所有工具共享统一的像素美学（#1a1a2e 深空背景 + #ffd700 金色强调 + 白色 3px 边框 + 4px 圆角 + Courier New 等宽字体）。

目前包含的工具分类：
- **学习类 LEARNING**：
  - 像素数学：预测系统 + 计算机系统 + 函数系统 + 学习系统
- **艺术类 ART**：
  - 像素图画：像素艺术生成器 + 像素绘图编辑器
  - 像素音乐：像素音乐合成器
- **其他**：MCP Server（命令行调用）、WebAssembly 加速（反应扩散试点）

## 功能 / Features

### 学习类 Learning

#### 像素数学

##### 预测系统
- 输入数字序列，用 40 种数学方法预测下一个数字
- 支持的方法分类：基础、平滑、回归、自回归、其他
- 含 10 种负数支持方法
- 神经网络预测（独立，不参与融合）：
  - 前馈 MLP（输入层动态 2-8，隐藏层 16，输出层 1）
  - 渐进式训练 + 数据增强 + 差分趋势修正
  - 智能整数吸附（仅当 |value-round| < 0.05 才吸附）
  - 网络可视化动画
- 长期训练模式：累积序列做增量训练，保留旧权重
- 过拟合算法：牛顿插值 + 高次平均 + 三次样条（独立显示）
- 偏移算法：11 种简单函数族 + 水平/垂直平移（独立显示）
- 函数拟合：自动拟合多项式并显示 R²
- 折线图：拖拽平移、+/- 缩放、自制滚动条
- 权重模式：回测权重 / 均匀权重
- 方法权重条形图：含过渡动画
- 导出 JSON / CSV

##### 计算机系统
- 像素风按键网格 + 长输入框（双向同步）
- 支持 + - × ÷ ( ) . 四则运算
- 支持 √ 根号运算（sqrt）
- 支持 sin / cos / tan 三角函数按键
- 支持 DEG / RAD 角度模式切换（默认 RAD）
- 特殊角度精确值查表（0/30/45/60/90/120/135/150/180/270/360 度返回精确值如 0.5、1、√2/2、√3/2）
- 非特殊角度浮点吸附（如 0.9999999999999999 → 1）
- 运算过程动态化显示：点击 = 后立即显示最终结果，运算过程逐步动画显示（每步 400ms，含高亮合并动画）
- 大数与多小数显示：科学计数法展开为完整数字字符串，小数保留最多 20 位
- 运算过程分步化简（先 sqrt → 再 sin/cos/tan → 再括号 → 再乘除 → 再加减）
- 多个乘除法逐步显示（如 `2*3*4 → 6*4 → 24`，每个乘法单独一步，不跳步）
- 合并动画：每步以高亮金色 + 上方位移 + 半透明出现，200ms 后过渡为正常样式（模拟下移合并）
- 安全表达式求值（AST 解析 + 纯函数求值，不使用 eval/new Function）
- 按键网格独占一行，输入框与运算过程框在下方纵向堆叠

##### 函数系统
- 输入函数表达式，在平面直角坐标系中绘制图像
- 支持格式：`y=表达式` 或 `f(x)=表达式`
- 支持函数：sin, cos, tan, log, sqrt, abs, exp, asin, acos, atan, floor, ceil, round
- 支持运算：+ - * / ^（幂运算，右结合）
- 支持常量：PI, E
- **参数滑块**：
  - 自动检测表达式中的参数变量（a, b, c, d 等单字母变量）
  - 每个滑块可设置 min/max/step
  - 拖动滑块实时更新函数图像
  - 多函数共享同名参数
- **参数动画**：
  - 播放/暂停按钮，所有滑块在 min-max 之间往复运动
  - 速度可调（0.5x / 1x / 2x）
  - sin 波形平滑过渡，每个参数随机相位
- 鼠标拖拽平移坐标系（原点跟随鼠标移动）
- 滚轮缩放（以鼠标位置为缩放中心）
- 右下角 +/− 按钮缩放（以画布中心为缩放中心）
- **触摸支持**：单指拖拽平移、双指捏合缩放
- 多函数叠加（不同颜色：金/水蓝/火红/树叶绿/紫/粉/青/白循环）
- 函数列表显示已添加的函数（颜色块 + 表达式 + 删除按钮）
- 清除全部按钮
- 网格线 + 坐标轴（带箭头）+ 原点标记 O + 刻度数字 + 轴标签 x/y
- 渐近线防护（如 tan 在 π/2 附近断开，不画跨屏长线）
- 安全表达式求值（AST 递归下降解析 + 纯函数求值，深度限制 100 层）
- 单位长度像素（scale）范围限制 10-200，防止坐标系混乱

##### 学习系统
- **数学学习卡片**分组（为未来扩展预留）
- **四则运算学习卡片**：
  - 4 种运算：加法、减法、乘法、除法
  - 每种 20 关，难度递增（10以内→20以内→100以内→1000以内 / 表内乘法→两位数乘法）
  - 多页（多关卡）方式展现，每页一题
  - 动画效果：题目滑入、答对粒子庆祝、答错抖动提示
  - 进度条 + 星级评价（3星/2星/1星）
  - 结果页含错题回顾
  - 减法结果非负，除法整除无余数
- **混合运算学习卡片**：
  - 三个难度级别，每级 15 关
  - 简单：2 个数加减混合
  - 中等：3 个数乘除 + 加减混合
  - 困难：4 个数 + 括号四则混合
  - 错题回顾显示分步运算过程
  - 复用四则运算卡片的动画框架

### 艺术类 Art

#### 像素图画 Pixel Drawing

##### 像素艺术生成器
- **8 种艺术模式**：
  - 流场 Flow Field
  - 粒子系统 Particles
  - 几何马赛克 Mosaic
  - 螺旋 Spiral
  - **L-system 分形树**（递归分支，深度/角度/衰减/长度可调）
  - **Voronoi 镶嵌**（随机种子点 + Lloyd 松弛，按距离/大小配色）
  - **波干涉 Wave Interference**（多波源叠加，振幅映射颜色）
  - **反应扩散 Reaction-Diffusion**（Gray-Scott 模型，斑图生成）
- 种子化随机：相同种子产生相同图像
- 默认分辨率 48（可调 24-96），画布填满显示区域
- CSS image-rendering: pixelated 放大显示
- HSB 色彩模式，色相参数生成 8 色调色板
- 每种模式有专属参数滑块
- 重新生成 / 下载 PNG / 动画播放
- **WebAssembly 加速**（反应扩散模式，设置页开关，自动 JS 回退）

##### 像素绘图编辑器
- 画布网格（默认 32×32，可调 16/32/64/128）
- **工具**：
  - 画笔、橡皮、取色器、填色桶
  - 直线（Bresenham 算法）、矩形、圆形（中点圆算法）
- **调色板**：16 色 PICO-8 风格 + 自定义颜色选择器
- **撤销 / 重做**（最多 50 步历史栈）
- 快捷键：B 画笔 / E 橡皮 / I 取色 / F 填色 / L 直线 / R 矩形 / C 圆形 / G 网格 / M 镜像 / Ctrl+Z 撤销 / Ctrl+Y 重做
- 网格线显示开关
- 水平镜像绘画（开关）
- 右键取色
- 清空画布按钮
- 导出 PNG（原始像素尺寸，pixelated）
- **触摸支持**：单指绘画

#### 像素音乐 Pixel Music

##### 像素音乐合成器
- Web Audio API 生成 8-bit chiptune 音色
- **4 种音色**：方波 / 三角波 / 锯齿波 / 噪声
- **钢琴键盘**：两个八度，鼠标点击 + 键盘按键（A-L/W-U）
- 音量控制 + 八度切换
- ADSR 包络（Attack 10ms / Decay 100ms / Sustain 0.7 / Release 200ms）
- 波形可视化示波器（Canvas 实时绘制）
- **Sequencer**：16 步 × 4 轨网格编辑器
  - 每轨独立音色、音量、音高
  - BPM 可调（60-200）
  - 循环播放，当前步高亮
  - 精确调度（lookahead + Web Audio clock）
- **触摸支持**：钢琴键多点触控

### 个人系统
- 临时账号注册（sessionStorage，关闭浏览器自动销毁）
- 修改昵称
- 上传头像（jpg/png/gif/webp/svg，自动压缩 + SVG XSS 消毒）
- 自定义背景图片或颜色
- 图片上传无大小限制：≤500KB 直接用，>500KB 用 canvas 压缩
  - 头像：256×256 居中裁剪，JPEG 0.85
  - 背景：最长边 1920px 保持比例，JPEG 0.8
  - SVG 不压缩
- 一键恢复默认背景
- 左上角浮动头像按钮（点击进入设置，hover 显示昵称 tooltip）
- 退出登录按钮位于设置页（清除临时账号并重新弹注册窗）
- **语言设置**：跟随系统 / 中文 / 英文（自动检测 navigator.language）
- **WebAssembly 加速开关**：反应扩散模式启用 Wasm 加速（默认关闭）

### 页面结构
```
像素风格工具网站首页（PIXEL TOOLS）
├── 学习类 LEARNING
│   └── 像素数学卡片
│       └── 像素数学首页
│           ├── 预测系统
│           ├── 函数系统
│           ├── 计算机系统
│           └── 学习系统
│               └── 数学学习卡片
│                   ├── 四则运算学习卡片
│                   └── 混合运算学习卡片
└── 艺术类 ART
    ├── 像素图画 PIXEL DRAWING
    │   ├── 像素艺术生成器
    │   └── 像素绘图编辑器
    └── 像素音乐 PIXEL MUSIC
        └── 像素音乐合成器
```

页面标题统一为卡片名称：
- 像素数学首页：像素数学 / PIXEL MATH
- 预测系统：预测系统 PIXEL PREDICTOR
- 函数系统：函数系统 PIXEL FUNCTION
- 计算机系统：计算机系统 PIXEL CALCULATOR
- 学习系统首页：学习系统 / LEARNING SYSTEM
- 四则运算：四则运算练习 / ARITHMETIC PRACTICE
- 混合运算：混合运算练习 / MIXED ARITHMETIC
- 像素艺术生成器：像素艺术生成器 PIXEL ART
- 像素绘图编辑器：像素绘图编辑器 / PIXEL DRAWING EDITOR
- 像素音乐合成器：像素音乐合成器 / PIXEL MUSIC SYNTH

## 移动端支持 / Mobile Support
- 响应式布局（手机 / 平板 / 桌面自适应）
- 768px 以下双栏变单栏
- 按钮最小触控尺寸 44×44px
- 触摸手势：
  - 函数系统：单指拖拽平移、双指捏合缩放
  - 像素绘图编辑器：单指绘画
  - 音乐合成器：钢琴键多点触控
- 禁用双击缩放
- 虚拟键盘弹出时输入框自适应

## PWA 支持
- Web App Manifest（可安装到主屏幕）
- Service Worker 离线缓存（Cache-First 策略）
- 像素风应用图标（192px + 512px）
- 独立显示模式（standalone）
- 主题色 #1a1a2e

## 国际化 / i18n
- 中文 + 英文双语支持
- 自动检测系统语言（navigator.language）
- 设置页手动切换：跟随系统 / 中文 / 英文
- 切换语言实时生效，无需刷新
- 语言选择持久化到 localStorage
- 所有 UI 文字均走翻译（标题、按钮、标签、提示、toast 等）

## 安全 / Security
- SVG 上传 XSS 消毒（DOMParser 移除 script/on*/foreignObject/外链）
- 图片解压炸弹防护（限制最大像素尺寸）
- 表达式求值 AST 解析（不使用 eval/new Function，白名单函数，深度限制）
- 安全审查报告：`.trae/security-review-report.md`

## MCP Server
- FastMCP + Python 实现（stdio 传输）
- 3 个工具：calculate / predict_sequence / list_predictors
- 详见 `mcp-server/README.md`

## WebAssembly 加速
- 反应扩散（Reaction-Diffusion）算法 C 语言实现
- Emscripten 编译为 .wasm（编译脚本：`wasm/build.sh`）
- 设置页开关控制，默认关闭
- 自动检测浏览器支持，加载失败自动回退 JS 版本
- 相同种子 + 参数，Wasm 与 JS 版本输出视觉一致

## 技术栈 / Tech Stack
- 纯原生 HTML / CSS / JavaScript（无框架、无构建工具）
- Canvas 2D 绘图（折线图、神经网络可视化、权重条形图、函数图像、像素编辑器）
- p5.js（像素艺术生成器，CDN 引入）
- Web Audio API（音乐合成器）
- WebAssembly（反应扩散加速，可选）
- Service Worker（PWA 离线缓存）
- sessionStorage / localStorage 持久化
- GitHub Pages 部署
- GitHub Actions 自动部署（需手动添加 workflow）

## 文件结构 / File Structure
```
pixel-tools/
├── index.html                    # 主页面（含所有页面 div）
├── manifest.json                 # PWA manifest
├── service-worker.js             # Service Worker
├── styles/
│   └── pixel.css                 # 像素风样式
├── js/
│   ├── i18n.js                   # 中英文国际化
│   ├── expression-parser.js      # 安全表达式解析器（AST）
│   ├── predictors.js             # 40 种预测方法
│   ├── weights.js                # 权重计算 + 回测
│   ├── nn.js                     # 神经网络（含增量训练）
│   ├── funcfit.js                # 函数拟合
│   ├── overfit.js                # 过拟合算法
│   ├── offsetfit.js              # 偏移算法
│   ├── chart.js                  # 折线图 + 权重条形图
│   ├── pixel-art.js              # 像素艺术生成器（依赖 p5.js）
│   ├── function-plotter.js       # 函数系统（平面直角坐标系绘图）
│   ├── pixel-drawing-editor.js   # 像素绘图编辑器
│   ├── pixel-music.js            # 像素音乐合成器
│   ├── math-cards.js             # 数学学习卡片（四则+混合）
│   └── app.js                    # 主应用逻辑
├── wasm/
│   ├── reaction-diffusion.c      # 反应扩散 C 源码
│   ├── build.sh                  # Emscripten 编译脚本
│   └── reaction-diffusion.wasm   # 编译产物（需本地编译）
├── icons/
│   ├── icon-192.png              # PWA 图标 192px
│   └── icon-512.png              # PWA 图标 512px
├── mcp-server/                   # MCP Server
│   ├── server.py
│   ├── requirements.txt
│   └── README.md
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Actions 自动部署
├── README.md
├── .gitignore
└── .trae/
    └── specs/                    # 规格文档
```

## 使用说明 / Usage
1. 打开 https://xiaozhenweiyan.github.io/pixel-tools/
2. 首次访问会弹窗询问昵称（可跳过，默认"访客"）
3. 左上角浮动头像按钮可进入个人设置（点击），hover 显示昵称
4. 头像右侧紧邻齿轮按钮（left:60px），点击进入个人设置（修改昵称、头像、背景、语言、Wasm 加速）
5. 工具首页分为"学习类"和"艺术类"两大分类：
   - 学习类 → 像素数学 → 预测系统/函数系统/计算机系统/学习系统
   - 艺术类 → 像素图画 → 像素艺术生成器/像素绘图编辑器
   - 艺术类 → 像素音乐 → 像素音乐合成器
6. 预测系统：在输入框输入数字序列（空格/逗号/换行分隔），选择预测数量，点击"预测"
7. 计算机系统：用按键或键盘输入表达式，按 = 或回车求值，运算过程逐步合并动画显示
8. 计算机系统支持 sin/cos/tan 与 DEG/RAD 切换：点击 DEG/RAD 按键切换角度模式
9. 函数系统：在输入框输入 `y=表达式` 或 `f(x)=表达式`（如 `y=x^2`、`f(x)=sin(x)`），按回车添加；鼠标拖拽平移、滚轮缩放、右下角 +/- 按钮缩放
10. 函数系统参数滑块：输入含参数的表达式（如 `y=a*sin(b*x)`），自动出现滑块，拖动实时更新图像，可开启动画往复
11. 像素绘图编辑器：用画笔等工具创作像素画，支持撤销重做，导出 PNG
12. 像素音乐合成器：点击琴键或按键盘演奏，用 Sequencer 编排旋律
13. 学习系统：选择四则运算或混合运算卡片，闯关练习，挑战星级评价
14. 语言切换：设置页 → 语言下拉框 → 跟随系统 / 中文 / 英文
15. Wasm 加速：设置页 → WebAssembly 加速开关（反应扩散模式生效）
16. 退出按钮在设置页内：清除临时账号数据并重新弹注册窗

## 关于自定义域名 / About Custom Domain

- 当前访问地址：https://xiaozhenweiyan.github.io/pixel-tools/
- 仓库地址：https://github.com/xiaozhenweiyan/pixel-tools
- 想去掉 github.io 短网址（如 `https://pixel-tools`）需要购买自己的域名（如 `pixeltools.com`、`pixel.tools` 等），然后在 GitHub Pages Settings → Custom Domain 配置
- 注意 `https://pixel-tools` 不是合法域名（顶级域名为空），无法配置

## 设计风格 / Design
- 主色：#1a1a2e（深空背景）
- 强调色：#ffd700（金色）
- 边框：白色 3px 实线
- 圆角：4px（像素风，非大圆角）
- 字体：Courier New 等宽
- 阴影：4px 偏移硬阴影（无模糊）
- 按钮悬停：左上偏移 + 阴影增大
- 按钮按下：右下偏移 + 阴影消失

## License
MIT License

## 作者
xiaozhenweiyan
