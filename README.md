# 像素风格工具网站 Pixel Tools

复古像素风格的在线工具集合，涵盖学习、艺术、工具、娱乐四大类。

## 在线访问
https://xiaozhenweiyan.github.io/pixel-tools/

## 工具分类

### 学习类 LEARNING
- **像素数学**：数字序列预测（40种算法+神经网络）、函数系统（2D/3D）、计算器
- **像素编程**：像素迷宫生成器（4种算法）、神经网络可视化器
- **学习系统**：四则运算、混合运算、分数、小数、方程、几何、速算挑战

### 艺术类 ART
- **像素图画**：像素艺术生成器、像素绘图编辑器
- **像素音乐**：像素音乐合成器
- **像素沙盒**：物理模拟器、AI图像像素化

### 工具类 TOOLS
- 像素时钟（时钟/日历/番茄钟）

### 娱乐类 ENTERTAINMENT
- 像素RPG小游戏

## 功能特性
- 复古像素风格 UI
- 中英文双语支持
- PWA 离线可用
- 响应式设计（桌面+移动端）
- 首页分类折叠展开（状态持久化）
- 首页"最近使用"快捷区（记录最近 3 个工具）
- ESC 键返回上一级页面
- 纯前端实现，无需后端

## 技术栈
- 原生 JavaScript（无框架）
- Canvas 2D API
- Web Audio API
- Service Worker (PWA)
- CSS Variables

## 本地开发
```bash
git clone https://github.com/xiaozhenweiyan/pixel-tools.git
cd pixel-tools
# 用任意静态服务器打开，如：
python3 -m http.server 8000
# 访问 http://localhost:8000
```

## 项目结构
```
pixel-tools/
├── index.html                  # 主页面
├── styles/
│   └── pixel.css               # 全局样式
├── js/
│   ├── app.js                  # 主应用逻辑（页面切换、历史栈、首页增强）
│   ├── i18n.js                 # 国际化（中英文双语）
│   ├── expression-parser.js    # 表达式解析（AST）
│   ├── predictors.js           # 40 种序列预测方法
│   ├── weights.js              # 权重计算 + 回测
│   ├── nn.js                   # 神经网络（含增量训练）
│   ├── funcfit.js              # 函数拟合
│   ├── overfit.js              # 过拟合算法
│   ├── offsetfit.js            # 偏移算法
│   ├── chart.js                # 折线图 + 权重条形图
│   ├── function-plotter.js     # 2D 函数绘制
│   ├── function-3d.js          # 3D 函数渲染
│   ├── math-cards.js           # 数学学习卡片（四则+混合）
│   ├── math-cards-ext.js       # 数学卡片扩展（分数/小数/方程/几何/速算）
│   ├── maze-generator.js       # 迷宫生成器
│   ├── nn-visualizer.js        # 神经网络可视化
│   ├── pixel-art.js            # 像素艺术生成器（依赖 p5.js）
│   ├── pixel-drawing-editor.js # 像素绘图编辑器
│   ├── pixel-music.js          # 像素音乐合成器
│   ├── physics-sandbox.js      # 物理模拟器
│   ├── image-pixelizer.js      # 图像像素化
│   ├── pixel-clock.js          # 像素时钟
│   ├── pixel-rpg.js            # 像素RPG
├── wasm/
│   ├── reaction-diffusion.c    # 反应扩散 C 源码
│   └── build.sh                # Emscripten 编译脚本
├── icons/
│   ├── icon-192.png            # PWA 图标 192px
│   └── icon-512.png            # PWA 图标 512px
├── mcp-server/                 # MCP Server（FastMCP + Python）
│   ├── server.py
│   ├── requirements.txt
│   └── README.md
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 自动部署
├── service-worker.js           # PWA Service Worker
├── manifest.json               # PWA Manifest
└── README.md
```

## 首页交互说明

- **分类折叠**：点击 4 个分类标题（学习类/艺术类/工具类/娱乐类）可折叠/展开该分类下的卡片，折叠状态会保存到 localStorage，下次访问自动恢复。
- **最近使用**：首页顶部"最近使用"区域显示最近访问的 3 个工具，点击卡片即可快速进入。点击"清空"按钮可清除记录。无记录时该区域自动隐藏。
- **ESC 返回上一级**：在任何子页面按 ESC 键可返回上一级页面，连按可逐级回到首页。在首页按 ESC 不响应；输入框聚焦时按 ESC 优先失焦。

## License
MIT
