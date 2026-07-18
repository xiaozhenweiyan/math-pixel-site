/**
 * chart.js
 * 复古深空像素风图表 — 折线图 & 权重条形图 (Pixel-style Charts)
 *
 * 通过 <script> 标签加载，导出全局函数（无模块导出）。
 * 纯原生 Canvas API 实现，不依赖任何第三方库（无 Chart.js / D3 / p5.js）。
 *
 * 导出函数 / Exported functions：
 *   - setupCanvas(canvas, w, h) → ctx                                 高 DPI 适配
 *   - drawLineChart(canvas, series, ensemblePrediction, methodPredictions)
 *   - drawWeightBars(canvas, methods, weights)
 *
 * 视觉规范 / Visual style：
 *   - 背景 #1a1a2e，白色 3px 边框，4px 圆角，硬阴影 (shadowBlur=0)
 *   - 文字：bold "Courier New", monospace
 *   - 分类配色：basic #8b4513 / smoothing #1e90ff / regression #228b22
 *               autoregressive #9370db / other #ffd700
 *   - 强调金 #ffd700，融合火红 #ff4500
 */

// ============================================================
// 常量 / Constants
// ============================================================

// 分类调色板 / Category palette
const CHART_PALETTE = {
  basic: '#8b4513',          // 土棕
  smoothing: '#1e90ff',      // 水蓝
  regression: '#228b22',     // 叶绿
  autoregressive: '#9370db', // 紫
  other: '#ffd700'           // 金
};

const CHART_BG = '#1a1a2e';
const CHART_BORDER = '#ffffff';
const CHART_GOLD = '#ffd700';
const CHART_FIRE = '#ff4500';
const CHART_GRID = 'rgba(255,255,255,0.08)';
const CHART_TOOLTIP_BG = '#2d2d44';

// 折线图状态缓存，用于鼠标 hover 重绘 / line chart state for hover redraw
let lineChartState = null;

// ============================================================
// 通用工具 / Shared Helpers
// ============================================================

/**
 * setupCanvas(canvas, w, h) → ctx
 *
 * 按 devicePixelRatio 缩放画布以适配高 DPI 显示。
 * 设置 canvas.width/height 为物理像素，style.width/height 为 CSS 像素，
 * 并对 ctx 应用 scale(dpr, dpr)，使后续绘制以 CSS 像素坐标进行。
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} w  CSS 像素宽
 * @param {number} h  CSS 像素高
 * @returns {CanvasRenderingContext2D}
 */
function setupCanvas(canvas, w, h) {
  var dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  var ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); // 重置变换，避免累积 / reset transform to avoid accumulation
  ctx.scale(dpr, dpr);
  return ctx;
}

/**
 * 圆角矩形路径 / Rounded rectangle path (兼容性兜底 / fallback for older browsers)。
 */
function chartRoundRect(ctx, x, y, w, h, r) {
  // 保证半径不超出尺寸 / clamp radius
  var rr = Math.max(0, Math.min(r, w / 2, h / 2));
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, rr);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/** 应用硬阴影 / apply hard shadow (shadowBlur=0)。 */
function chartApplyShadow(ctx) {
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.shadowBlur = 0;
}

/** 清除阴影 / clear shadow。 */
function chartClearShadow(ctx) {
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;
}

/** 按分类取色，未知分类回退金色 / get color by category, fallback gold。 */
function chartCategoryColor(category) {
  if (category && CHART_PALETTE[category]) return CHART_PALETTE[category];
  return CHART_PALETTE.other;
}

/** 设置粗体等宽字体 / set bold monospace font。 */
function chartFont(ctx, size) {
  ctx.font = 'bold ' + size + 'px "Courier New", Courier, monospace';
}

/** 数值格式化：整数原样，小数保留两位 / format number (int as-is, else 2 decimals)。 */
function chartFormatVal(v) {
  if (v === null || v === undefined) return '—';
  var n = Number(v);
  if (!isFinite(n)) return '—';
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

// ============================================================
// 折线图布局计算 / Line Chart Layout (绘制与 hover 命中测试共享)
// ============================================================

/**
 * 计算折线图的几何布局 / compute line chart geometry。
 * 返回坐标映射函数与各区域边界，供绘制与 hover 命中测试复用。
 */
function computeLineChartLayout(canvas, series, ensemblePrediction, methodPredictions) {
  var defaultW = 800, defaultH = 400;
  var displayW = canvas.clientWidth || defaultW;
  // 固定纵横比 2:1 / fixed 2:1 aspect ratio
  var displayH = Math.round(displayW * defaultH / defaultW);
  if (displayW <= 0 || displayH <= 0) return null;

  // 内边距 / padding
  var padL = 60, padR = 30, padT = 30, padB = 50;
  var plotL = padL, plotT = padT;
  var plotR = displayW - padR;
  var plotB = displayH - padB;
  var plotW = plotR - plotL;
  var plotH = plotB - plotT;

  var n = series.length;
  var hasPredictionPoint = (ensemblePrediction !== null && ensemblePrediction !== undefined) ||
    (methodPredictions || []).some(function (m) { return m.prediction !== null && m.prediction !== undefined; });
  // X 轴索引 1..n（无预测点）或 1..n+1（含预测点）
  var xCount = n + (hasPredictionPoint ? 1 : 0);
  if (xCount < 1) xCount = 1;

  // Y 范围：综合序列 + 融合 + 各方法预测，10% 上下留白
  var allVals = series.slice();
  if (ensemblePrediction !== null && ensemblePrediction !== undefined) allVals.push(ensemblePrediction);
  (methodPredictions || []).forEach(function (m) {
    if (m.prediction !== null && m.prediction !== undefined) allVals.push(m.prediction);
  });
  var yMin, yMax;
  if (allVals.length === 0) {
    yMin = 0; yMax = 1;
  } else {
    yMin = Math.min.apply(null, allVals);
    yMax = Math.max.apply(null, allVals);
    if (yMin === yMax) { yMin = yMin - 1; yMax = yMax + 1; }
    var range = yMax - yMin;
    yMin -= range * 0.1;
    yMax += range * 0.1;
  }

  function xToPx(idx) {
    if (xCount <= 1) return plotL + plotW / 2;
    return plotL + ((idx - 1) / (xCount - 1)) * plotW;
  }
  function yToPx(v) {
    if (yMax === yMin) return plotT + plotH / 2;
    return plotT + (1 - (v - yMin) / (yMax - yMin)) * plotH;
  }

  return {
    displayW: displayW, displayH: displayH,
    plotL: plotL, plotT: plotT, plotR: plotR, plotB: plotB,
    plotW: plotW, plotH: plotH,
    n: n, xCount: xCount, hasPredictionPoint: hasPredictionPoint,
    yMin: yMin, yMax: yMax,
    xToPx: xToPx, yToPx: yToPx
  };
}

// ============================================================
// 折线图 / Line Chart
// ============================================================

/**
 * drawLineChart(canvas, series, ensemblePrediction, methodPredictions)
 *
 * 绘制复古像素风折线图：输入序列金色折线、融合预测火红方块、
 * 各方法预测半透明彩色方块，附带坐标轴、网格、图例与 hover 工具提示。
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number[]} series                        输入序列（如 [1,2,3,5,8]）
 * @param {number|null} ensemblePrediction         融合预测值，可为 null
 * @param {Array} methodPredictions                [{id,name,category,prediction}]
 */
function drawLineChart(canvas, series, ensemblePrediction, methodPredictions) {
  if (!canvas) return;
  series = series || [];
  methodPredictions = methodPredictions || [];

  var layout = computeLineChartLayout(canvas, series, ensemblePrediction, methodPredictions);
  if (!layout) return; // 容器尚未布局或尺寸为 0

  var displayW = layout.displayW, displayH = layout.displayH;
  var ctx = setupCanvas(canvas, displayW, displayH);

  // 缓存状态以支持 hover 重绘（同画布则保留上一次的 hoverPoint）
  var prevHover = (lineChartState && lineChartState.canvas === canvas) ? lineChartState.hoverPoint : null;
  lineChartState = {
    canvas: canvas,
    series: series,
    ensemblePrediction: ensemblePrediction,
    methodPredictions: methodPredictions,
    hoverPoint: prevHover
  };
  ensureLineChartHandlers(canvas);

  // 清屏 + 背景 / clear & background
  ctx.clearRect(0, 0, displayW, displayH);
  ctx.fillStyle = CHART_BG;
  ctx.fillRect(0, 0, displayW, displayH);

  var plotL = layout.plotL, plotT = layout.plotT, plotR = layout.plotR, plotB = layout.plotB;
  var n = layout.n, xCount = layout.xCount;
  var xToPx = layout.xToPx, yToPx = layout.yToPx;

  // --- 网格线 / grid lines (subtle, no dash) ---
  ctx.strokeStyle = CHART_GRID;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  var yTickCount = 5;
  for (var gi = 0; gi <= yTickCount; gi++) {
    var gy = plotT + ((plotB - plotT) / yTickCount) * gi;
    ctx.beginPath();
    ctx.moveTo(plotL, gy);
    ctx.lineTo(plotR, gy);
    ctx.stroke();
  }
  for (var xi = 1; xi <= xCount; xi++) {
    var gxp = xToPx(xi);
    ctx.beginPath();
    ctx.moveTo(gxp, plotT);
    ctx.lineTo(gxp, plotB);
    ctx.stroke();
  }

  // --- 坐标轴 / axes (white 3px) ---
  ctx.strokeStyle = CHART_BORDER;
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(plotL, plotB); ctx.lineTo(plotR, plotB); ctx.stroke(); // X 轴
  ctx.beginPath(); ctx.moveTo(plotL, plotT); ctx.lineTo(plotL, plotB); ctx.stroke();   // Y 轴

  // --- Y 轴刻度与标签 / Y ticks & labels ---
  ctx.fillStyle = CHART_BORDER;
  chartFont(ctx, 11);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (var yi = 0; yi <= yTickCount; yi++) {
    var yVal = layout.yMin + (layout.yMax - layout.yMin) * (1 - yi / yTickCount);
    var yp = plotT + ((plotB - plotT) / yTickCount) * yi;
    ctx.fillText(chartFormatVal(yVal), plotL - 8, yp);
  }

  // --- X 轴刻度与标签 / X ticks & labels ---
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (var xi2 = 1; xi2 <= xCount; xi2++) {
    ctx.fillText(String(xi2), xToPx(xi2), plotB + 8);
  }

  // --- 输入序列折线 / input series line (gold) ---
  if (n > 0) {
    ctx.strokeStyle = CHART_GOLD;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    for (var si = 0; si < n; si++) {
      var spx = xToPx(si + 1);
      var spy = yToPx(series[si]);
      if (si === 0) ctx.moveTo(spx, spy);
      else ctx.lineTo(spx, spy);
    }
    ctx.stroke();

    // 数据点：8x8 金色方块 + 白色 2px 边框 / 8x8 gold squares w/ white 2px border
    for (var si2 = 0; si2 < n; si2++) {
      var ppx = xToPx(si2 + 1);
      var ppy = yToPx(series[si2]);
      ctx.fillStyle = CHART_GOLD;
      ctx.fillRect(ppx - 4, ppy - 4, 8, 8);
      ctx.strokeStyle = CHART_BORDER;
      ctx.lineWidth = 2;
      ctx.strokeRect(ppx - 4, ppy - 4, 8, 8);
    }
  }

  // --- 各方法预测点 / method prediction points (semi-transparent, jittered) ---
  // 仅在有序列时绘制预测点 / only draw predictions when series exists
  if (n > 0) {
    var validMethods = methodPredictions.filter(function (m) {
      return m.prediction !== null && m.prediction !== undefined;
    });
    var methodsCount = validMethods.length;
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.setLineDash([]);
    validMethods.forEach(function (m, idx) {
      var mx = xToPx(n + 1);
      var my = yToPx(m.prediction);
      // 垂直抖动，避免预测聚集时重叠 / vertical jitter to spread clustered predictions
      my += (idx - methodsCount / 2) * 7;
      ctx.fillStyle = chartCategoryColor(m.category);
      ctx.fillRect(mx - 3, my - 3, 6, 6);
    });
    ctx.restore();
  }

  // --- 融合预测点 / ensemble prediction point (fire red) ---
  if (ensemblePrediction !== null && ensemblePrediction !== undefined && n > 0) {
    var ex = xToPx(n + 1);
    var ey = yToPx(ensemblePrediction);
    // 虚线连接：最后一个序列点 → 融合预测点
    var lastPx = xToPx(n);
    var lastPy = yToPx(series[n - 1]);
    ctx.strokeStyle = 'rgba(255,69,0,0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(lastPx, lastPy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);

    // 14x14 火红方块 + 白色 3px 边框 / 14x14 fire-red square w/ white 3px border
    ctx.fillStyle = CHART_FIRE;
    ctx.fillRect(ex - 7, ey - 7, 14, 14);
    ctx.strokeStyle = CHART_BORDER;
    ctx.lineWidth = 3;
    ctx.strokeRect(ex - 7, ey - 7, 14, 14);
  }

  // --- 图例 / legend (top-right inside plot area) ---
  drawLineChartLegend(ctx, plotR, plotT);

  // --- 工具提示 / tooltip (hover) ---
  if (lineChartState.hoverPoint) {
    drawLineChartTooltip(ctx, lineChartState.hoverPoint, plotL, plotT, plotR, plotB);
  }
}

/** 绘制折线图图例 / draw line chart legend. */
function drawLineChartLegend(ctx, plotR, plotT) {
  var items = [
    { color: CHART_GOLD, label: '输入序列', alpha: 1, size: 8 },
    { color: CHART_FIRE, label: '融合预测', alpha: 1, size: 10 },
    { color: '#1e90ff', label: '各方法预测', alpha: 0.65, size: 6 }
  ];
  var boxW = 132, boxH = 14 * items.length + 10;
  var x = plotR - boxW - 6;
  var y = plotT + 6;

  // 背景 + 硬阴影 / background with hard shadow
  ctx.fillStyle = CHART_TOOLTIP_BG;
  chartApplyShadow(ctx);
  chartRoundRect(ctx, x, y, boxW, boxH, 4);
  ctx.fill();
  chartClearShadow(ctx);
  // 白色边框 / white border
  ctx.strokeStyle = CHART_BORDER;
  ctx.lineWidth = 2;
  chartRoundRect(ctx, x, y, boxW, boxH, 4);
  ctx.stroke();

  // 文字与色块 / text & swatches
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  chartFont(ctx, 11);
  items.forEach(function (it, i) {
    var iy = y + 9 + i * 14;
    ctx.save();
    ctx.globalAlpha = it.alpha;
    ctx.fillStyle = it.color;
    ctx.fillRect(x + 8, iy - it.size / 2, it.size, it.size);
    ctx.restore();
    ctx.fillStyle = CHART_BORDER;
    ctx.fillText(it.label, x + 8 + it.size + 6, iy);
  });
}

/** 绘制折线图工具提示 / draw line chart tooltip. */
function drawLineChartTooltip(ctx, hover, plotL, plotT, plotR, plotB) {
  var title = '索引: ' + hover.index;
  var body;
  if (hover.type === 'ensemble') {
    body = '融合预测: ' + chartFormatVal(hover.value);
  } else if (hover.type === 'prediction') {
    body = '预测: ' + chartFormatVal(hover.value);
  } else {
    body = '值: ' + chartFormatVal(hover.value);
  }

  chartFont(ctx, 11);
  var w1 = ctx.measureText(title).width;
  var w2 = ctx.measureText(body).width;
  var textW = Math.max(w1, w2);
  var boxW = textW + 16; // 8px 内边距左右 / 8px padding each side
  var boxH = 36;

  // 默认置于点右上方，越界则翻转 / place top-right of point, flip if out of bounds
  var x = hover.px + 12;
  var y = hover.py - boxH - 8;
  if (x + boxW > plotR) x = hover.px - boxW - 12;
  if (y < plotT) y = hover.py + 12;
  if (x < plotL) x = plotL + 4;

  // 深色背景 + 硬阴影 / dark bg with hard shadow
  ctx.fillStyle = CHART_TOOLTIP_BG;
  chartApplyShadow(ctx);
  chartRoundRect(ctx, x, y, boxW, boxH, 4);
  ctx.fill();
  chartClearShadow(ctx);
  // 白色 2px 边框 / white 2px border
  ctx.strokeStyle = CHART_BORDER;
  ctx.lineWidth = 2;
  chartRoundRect(ctx, x, y, boxW, boxH, 4);
  ctx.stroke();

  // 文字 / text
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = CHART_GOLD;
  ctx.fillText(title, x + 8, y + 6);
  ctx.fillStyle = CHART_BORDER;
  ctx.fillText(body, x + 8, y + 6 + 16);
}

// ============================================================
// 折线图 hover 事件 / Line Chart Hover Handling
// ============================================================

/** 为画布绑定一次性 mousemove/mouseleave 处理器 / bind hover handlers once per canvas. */
function ensureLineChartHandlers(canvas) {
  if (canvas.__lineChartBound) return;
  canvas.__lineChartBound = true;

  canvas.addEventListener('mousemove', function (ev) {
    if (!lineChartState || lineChartState.canvas !== canvas) return;
    var rect = canvas.getBoundingClientRect();
    var mx = ev.clientX - rect.left;
    var my = ev.clientY - rect.top;
    var hover = findNearestLineChartPoint(mx, my, 20);
    var prev = lineChartState.hoverPoint;
    // 仅在 hover 变化时重绘 / only redraw when hover changed
    var changed = !hover !== !prev ||
      (hover && prev && (hover.px !== prev.px || hover.py !== prev.py ||
        hover.type !== prev.type || hover.index !== prev.index));
    if (!changed) return;
    lineChartState.hoverPoint = hover;
    drawLineChart(canvas, lineChartState.series, lineChartState.ensemblePrediction, lineChartState.methodPredictions);
  });

  canvas.addEventListener('mouseleave', function () {
    if (!lineChartState || lineChartState.canvas !== canvas) return;
    if (!lineChartState.hoverPoint) return;
    lineChartState.hoverPoint = null;
    drawLineChart(canvas, lineChartState.series, lineChartState.ensemblePrediction, lineChartState.methodPredictions);
  });
}

/**
 * 在 20px 阈值内查找最近的数据点 / find nearest data point within threshold.
 * 重新计算布局（基于当前 clientWidth）以保证命中测试与绘制坐标一致。
 */
function findNearestLineChartPoint(mx, my, threshold) {
  if (!lineChartState) return null;
  var s = lineChartState;
  var layout = computeLineChartLayout(s.canvas, s.series, s.ensemblePrediction, s.methodPredictions);
  if (!layout) return null;

  var best = null;
  var bestDist = threshold;
  var xToPx = layout.xToPx, yToPx = layout.yToPx;
  var n = layout.n;

  // 序列点 / series points
  for (var i = 0; i < s.series.length; i++) {
    var px = xToPx(i + 1);
    var py = yToPx(s.series[i]);
    var d = Math.hypot(px - mx, py - my);
    if (d <= bestDist) {
      bestDist = d;
      best = { px: px, py: py, index: i + 1, value: s.series[i], type: 'series' };
    }
  }

  // 融合预测点 / ensemble point
  if (s.ensemblePrediction !== null && s.ensemblePrediction !== undefined && n > 0) {
    var ex = xToPx(n + 1);
    var ey = yToPx(s.ensemblePrediction);
    var d2 = Math.hypot(ex - mx, ey - my);
    if (d2 <= bestDist) {
      bestDist = d2;
      best = { px: ex, py: ey, index: n + 1, value: s.ensemblePrediction, type: 'ensemble' };
    }
  }

  // 各方法预测点（含抖动偏移）/ method prediction points (with jitter)
  if (n > 0) {
    var validMethods = s.methodPredictions.filter(function (m) {
      return m.prediction !== null && m.prediction !== undefined;
    });
    var methodsCount = validMethods.length;
    validMethods.forEach(function (m, idx) {
      var mpx = xToPx(n + 1);
      var mpy = yToPx(m.prediction) + (idx - methodsCount / 2) * 7;
      var d3 = Math.hypot(mpx - mx, mpy - my);
      if (d3 <= bestDist) {
        bestDist = d3;
        best = { px: mpx, py: mpy, index: n + 1, value: m.prediction, type: 'prediction' };
      }
    });
  }

  return best;
}

// ============================================================
// 权重条形图 / Weight Bar Chart
// ============================================================

/**
 * drawWeightBars(canvas, methods, weights)
 *
 * 绘制按权重降序排列的方法权重条形图。每个条带按分类着色，
 * 白色 2px 圆角边框，顶部 2px 高光（像素 3D 效果），
 * 权重为 0 时绘制虚线空框表示"无贡献"。无 hover 交互。
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Array} methods    [{id,name,category,prediction,mape}]
 * @param {number[]} weights 与 methods 对齐的权重数组（每个 ∈ [0,1]，和≈1）
 */
function drawWeightBars(canvas, methods, weights) {
  if (!canvas) return;
  methods = methods || [];
  weights = weights || [];

  // 尺寸计算 / size computation
  var BAR_H = 18;       // 条形高度 / bar height
  var GAP = 6;          // 行间距 / row gap
  var HEADER_H = 40;    // 标题区 / header
  var END_PAD = 20;     // 底部留白 / bottom padding
  var PAD = 12;         // 四周内边距 / side padding
  var displayW = canvas.clientWidth || 400;
  if (displayW <= 0) displayW = 400;
  var displayH = HEADER_H + methods.length * (BAR_H + GAP) + END_PAD;

  var ctx = setupCanvas(canvas, displayW, displayH);
  if (displayW <= 0 || displayH <= 0) return;

  // 清屏 + 背景 / clear & background
  ctx.clearRect(0, 0, displayW, displayH);
  ctx.fillStyle = CHART_BG;
  ctx.fillRect(0, 0, displayW, displayH);

  // 头部标题 / header title
  ctx.fillStyle = CHART_BORDER;
  chartFont(ctx, 14);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('方法权重 (降序)', PAD, 12);

  // 复制并按权重降序排序（不修改原数组）/ copy & sort by weight desc (no mutation)
  var rows = methods.map(function (m, i) {
    return { method: m, weight: (weights[i] != null && isFinite(weights[i])) ? weights[i] : 0 };
  });
  rows.sort(function (a, b) { return b.weight - a.weight; });

  // 布局常量 / layout constants
  var labelX = PAD;
  var barX = PAD + 150;
  var pctW = 70;
  var barMaxW = displayW - PAD - 150 - pctW; // 任务公式 / per spec formula
  if (barMaxW < 20) barMaxW = 20;

  ctx.textBaseline = 'middle';

  rows.forEach(function (row, i) {
    var m = row.method || {};
    var w = row.weight;
    var y = HEADER_H + i * (BAR_H + GAP);

    // 名称标签（超 14 字截断 …）/ name label (truncate to 14 chars)
    var name = m.name ? String(m.name) : '';
    if (name.length > 14) name = name.slice(0, 13) + '…';
    ctx.fillStyle = CHART_BORDER;
    chartFont(ctx, 11);
    ctx.textAlign = 'left';
    ctx.fillText(name, labelX, y + BAR_H / 2);

    var color = chartCategoryColor(m.category);
    var barW = Math.max(0, Math.min(barMaxW, w * barMaxW));

    if (w === 0) {
      // 权重为 0：虚线空框表示"无贡献" / weight 0: dashed empty bar
      ctx.strokeStyle = CHART_BORDER;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      chartRoundRect(ctx, barX, y, barMaxW, BAR_H, 4);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // 填充 + 硬阴影 / fill with hard shadow
      ctx.fillStyle = color;
      chartApplyShadow(ctx);
      chartRoundRect(ctx, barX, y, barW, BAR_H, 4);
      ctx.fill();
      chartClearShadow(ctx);
      // 白色 2px 边框 / white 2px border
      ctx.strokeStyle = CHART_BORDER;
      ctx.lineWidth = 2;
      chartRoundRect(ctx, barX, y, barW, BAR_H, 4);
      ctx.stroke();
      // 顶部 2px 高光（3D 像素效果）/ top 2px highlight (3D pixel effect)
      if (barW > 4) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        chartRoundRect(ctx, barX + 2, y + 2, barW - 4, 2, 1);
        ctx.fill();
      }
    }

    // 百分比标签（条形右侧）/ percentage label (right of bar)
    var pct = (w * 100).toFixed(2) + '%';
    ctx.fillStyle = CHART_BORDER;
    chartFont(ctx, 11);
    ctx.textAlign = 'left';
    ctx.fillText(pct, barX + barMaxW + 8, y + BAR_H / 2);
  });
}

// ============================================================
// 自检 / Self-test
// ============================================================
console.log('[chart] loaded');
console.log('[chart] drawLineChart:', typeof drawLineChart, '| drawWeightBars:', typeof drawWeightBars, '| setupCanvas:', typeof setupCanvas);
