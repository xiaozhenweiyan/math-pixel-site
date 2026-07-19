# Tasks

- [ ] Task 1: 顶栏自动隐藏 + 浮动按钮位置调整 (pixel.css + app.js)
  - [ ] SubTask 1.1: pixel.css 修改 `.topbar` 样式：默认 `top: -48px`，添加 `transition: top 0.3s ease`，添加 `.topbar.visible { top: 0; }`
  - [ ] SubTask 1.2: pixel.css 修改 `.floating-back-btn` 的 top 从 56px 改为 12px
  - [ ] SubTask 1.3: app.js 新增 `initTopbarAutoHide` 函数：监听 mousemove，鼠标 Y ≤ 6 时添加 .visible 类，鼠标 Y > 54 且不在 topbar 内时 300ms 后移除 .visible 类
  - [ ] SubTask 1.4: app.js init 中调用 initTopbarAutoHide()
  - [ ] SubTask 1.5: 注册弹窗显示时不影响顶栏（顶栏保持隐藏即可，无需特殊处理）

- [ ] Task 2: 移除个人系统卡片 + 顶栏入口 (index.html)
  - [ ] SubTask 2.1: index.html 移除落地页 `<button class="landing-card" id="btn-enter-settings">` 整块（含 SVG 和文字）
  - [ ] SubTask 2.2: app.js initPageSwitching 中移除 `btn-enter-settings` 的事件绑定（保留 btn-back-home-settings 的绑定）
  - [ ] SubTask 2.3: 验证顶栏"设置"按钮（btn-settings）仍能进入设置页

- [ ] Task 3: 计算器根号按键 (index.html + app.js)
  - [ ] SubTask 3.1: index.html 在计算器按键网格中新增 `√` 按钮（替换或新增一个位置），data-key="sqrt"，显示文字"√"
  - [ ] SubTask 3.2: app.js 修改 calcAppendKey：当 key === 'sqrt' 时向输入框追加 `sqrt(`（注意左括号需用户后续闭合）
  - [ ] SubTask 3.3: app.js 修改 calculateExpr：在白名单正则中加入 `sqrt`，并把 `sqrt(` 替换为 `Math.sqrt(`（用 Function 构造器求值）
  - [ ] SubTask 3.4: 验证 sqrt(9)=3、sqrt(4)+sqrt(9)=5、sqrt(3*3+4*4)=5

- [ ] Task 4: 运算过程动态显示 (index.html + pixel.css + app.js)
  - [ ] SubTask 4.1: index.html 在 calc-panel 内、按键网格旁边新增 `<div class="calc-steps" id="calc-steps">`（运算过程显示框），调整 calc-panel 布局为左右两栏（按键+过程）
  - [ ] SubTask 4.2: pixel.css 添加 `.calc-steps` 样式：像素风深空背景、3px 白边框、4px 圆角、最小高度、可滚动、等宽字体
  - [ ] SubTask 4.3: pixel.css 调整 calc-panel 布局：使用 grid 或 flex 让按键和过程框并排（桌面），移动端纵向堆叠
  - [ ] SubTask 4.4: app.js 新增 `showCalcSteps(steps)` 函数：清空 calc-steps，逐行 createElement + textContent 显示步骤（防 XSS）
  - [ ] SubTask 4.5: app.js 新增 `computeStepsWithTrace(expr)` 函数：用递归下降或重复求值法生成化简步骤
    - 策略：找到最内层括号 → 求值 → 替换 → 重复；无括号时按优先级求值最高级运算（*/ 优先于 +-）→ 替换 → 重复；直到只剩一个数字
  - [ ] SubTask 4.6: app.js 修改 calcEvaluate：求值成功后调用 computeStepsWithTrace 生成步骤，调用 showCalcSteps 显示
  - [ ] SubTask 4.7: 错误时 calc-steps 显示"错误"，不清空历史

- [ ] Task 5: 图片上传自动压缩 (app.js)
  - [ ] SubTask 5.1: app.js 新增 `compressImage(file, maxDim, isAvatar)` 函数：返回 Promise<base64>
    - 文件 ≤ 500KB：直接 FileReader.readAsDataURL 返回
    - 文件 > 500KB：用 Image + canvas 压缩
      - 头像：256×256 居中裁剪，JPEG 0.85
      - 背景：最长边 ≤ 1920px 保持比例，JPEG 0.8
  - [ ] SubTask 5.2: app.js 新增 `safeSaveProfile()` 函数：在 saveProfile 的 try/catch 基础上，捕获 QuotaExceededError 时提示"图片过大，请用更小的图片"
  - [ ] SubTask 5.3: app.js 修改头像上传：移除 200KB 硬限制，改为调用 compressImage(file, 256, true)，压缩后存 profile.avatar
  - [ ] SubTask 5.4: app.js 修改背景图片上传：移除 1MB 硬限制，改为调用 compressImage(file, 1920, false)，压缩后存 profile.bgValue
  - [ ] SubTask 5.5: 移除原 readImageFile 中的 maxSize 参数和大小校验（或保留但传入很大的值，实际由 compressImage 处理）
  - [ ] SubTask 5.6: 压缩过程中显示 toast "正在压缩图片..."（大文件时）

- [ ] Task 6: 推送 GitHub
  - [ ] SubTask 6.1: 提交并推送到 origin main + gh-pages
  - [ ] SubTask 6.2: 验证 https://xiaozhenweiyan.github.io/math-pixel-site/ 可访问

# Task Dependencies
- [Task 1] 独立
- [Task 2] 独立
- [Task 3] 独立
- [Task 4] depends on [Task 3]（共享 calculateExpr 修改）
- [Task 5] 独立
- [Task 6] depends on all
