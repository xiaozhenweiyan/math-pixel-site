/**
 * app.js
 * 主应用逻辑：输入解析、预测流程、渲染、导出 (Main Application Logic)
 *
 * 依赖（通过 <script> 标签在 app.js 之前加载，顺序：predictors → weights → chart → app）：
 *   - predictors.js  → 全局 `predictors` 数组
 *   - weights.js     → backtest / computeWeights / uniformWeights
 *                      / ensemblePredict / computeMethodStats
 *   - chart.js       → setupCanvas / drawLineChart / drawWeightBars
 *
 * 安全规范：
 *   - 永不使用 innerHTML 渲染用户可控内容，统一使用 textContent / createElement + textContent（防 XSS）
 *   - 所有显示数字均通过 formatNumber 处理 null / NaN / Infinity
 *   - 所有输入在处理前进行校验
 *   - 对缺失 DOM 元素进行防御性处理（不抛错）
 */
(function () {
  'use strict';

  // ============================================================
  // 模块级变量 / Module-level state
  // ============================================================

  // Toast 计时器句柄 / toast timer handle
  let toastTimeout = null;

  // 窗口尺寸防抖计时器 / resize debounce timer
  let resizeTimeout = null;

  // 分类配色表 / category color map (inline style.backgroundColor)
  const CATEGORY_COLORS = {
    basic: '#8b4513',
    smoothing: '#1e90ff',
    regression: '#228b22',
    autoregressive: '#9370db',
    other: '#ffd700'
  };

  // 主应用状态 / main app state
  const state = {
    series: [],               // 当前输入序列 number[]
    stats: [],                // 方法统计列表（来自 computeMethodStats）
    weightMode: 'backtest',   // 'backtest' | 'uniform'
    weights: [],              // 当前权重 number[]（和为 1）
    ensemble: null            // 当前融合预测 number|null
  };

  // ============================================================
  // Part 1: 输入解析与校验 / Input Parsing & Validation
  // ============================================================

  /**
   * parseSequence(text) → { values: number[], ignored: number }
   * 按空白 / 逗号 / 分号 / 换行切分文本，解析为数值数组。
   * 非法 token（非数字或非有限值）计入 ignored 并跳过。
   */
  function parseSequence(text) {
    const values = [];
    let ignored = 0;
    if (typeof text !== 'string') {
      return { values: values, ignored: ignored };
    }
    // \s 已包含换行，故可处理多行输入
    const tokens = text.split(/[\s,;]+/);
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token === '') continue;            // 空字符串跳过
      const n = Number(token);
      if (Number.isNaN(n)) {                  // 非数字
        ignored++;
        continue;
      }
      if (!Number.isFinite(n)) {              // Infinity / -Infinity
        ignored++;
        continue;
      }
      values.push(n);
    }
    return { values: values, ignored: ignored };
  }

  /**
   * showToast(message, durationMs = 2500)
   * 显示 toast 提示，durationMs 后自动隐藏。
   * 仅使用 textContent（绝不使用 innerHTML，防 XSS）。
   */
  function showToast(message, durationMs) {
    if (typeof durationMs !== 'number' || !Number.isFinite(durationMs)) {
      durationMs = 2500;
    }
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;                // XSS 防护：仅 textContent
    el.style.display = 'block';
    if (toastTimeout !== null) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }
    toastTimeout = setTimeout(function () {
      el.style.display = 'none';
      toastTimeout = null;
    }, durationMs);
  }

  /**
   * validateInput(values) → boolean
   * 校验输入序列长度 ≥ 2，否则提示并返回 false。
   */
  function validateInput(values) {
    if (!Array.isArray(values) || values.length < 2) {
      showToast('至少需要 2 个数字');
      return false;
    }
    return true;
  }

  // ============================================================
  // Part 2: 当前权重 / Current Weights
  // ============================================================

  /**
   * getCurrentWeights() → number[]
   * 根据当前权重模式返回权重数组（和为 1）。
   */
  function getCurrentWeights() {
    if (state.weightMode === 'uniform') {
      return uniformWeights(predictors, state.series);
    }
    return computeWeights(predictors, state.series); // 默认 backtest
  }

  // ============================================================
  // Part 3: 预测流程 / Prediction Flow
  // ============================================================

  /**
   * runPrediction()
   * 读取输入 → 解析 → 校验 → 计算统计与融合预测 → 渲染。
   */
  function runPrediction() {
    const textarea = document.getElementById('input-series');
    if (!textarea) return;
    const text = textarea.value || '';
    const { values, ignored } = parseSequence(text);
    if (ignored > 0) {
      showToast('已忽略 ' + ignored + ' 个非法值');
    }
    if (!validateInput(values)) return;

    state.series = values;
    state.stats = computeMethodStats(predictors, values);
    state.weights = getCurrentWeights();
    state.ensemble = ensemblePredict(
      state.stats.map(function (s) { return s.prediction; }),
      state.weights
    );
    renderAll();
  }

  /**
   * renderAll()
   * 渲染全部 UI 区域。
   */
  function renderAll() {
    renderEnsemble();
    renderMethodList();
    renderLineChart();
    renderWeightBars();
  }

  /**
   * formatNumber(n) → string
   * null / undefined / 非有限值 → '—'；整数原样输出；
   * 小数保留 4 位并去除尾随零。
   */
  function formatNumber(n) {
    if (n === null || n === undefined) return '—';
    if (!Number.isFinite(n)) return '—';
    if (Number.isInteger(n)) return String(n);
    // toFixed(4) 后用 parseFloat 去除尾随零
    return parseFloat(n.toFixed(4)).toString();
  }

  /**
   * renderEnsemble()
   * 渲染融合预测结果区域。
   */
  function renderEnsemble() {
    const el = document.getElementById('ensemble-result');
    if (!el) return;
    if (state.ensemble === null || !Number.isFinite(state.ensemble)) {
      el.textContent = '— 无法预测 —';
      return;
    }
    el.textContent = '预测值: ' + formatNumber(state.ensemble);
  }

  /**
   * renderMethodList()
   * 渲染方法详情列表（使用 DOM API，绝不使用 innerHTML）。
   */
  function renderMethodList() {
    const el = document.getElementById('method-list');
    if (!el) return;
    // 清空：逐个移除子节点 / clear children without innerHTML
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
    if (state.stats.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = '— 等待预测 —';
      el.appendChild(empty);
      return;
    }
    for (let i = 0; i < state.stats.length; i++) {
      const m = state.stats[i];
      const item = document.createElement('div');
      item.className = 'method-item';

      // 分类色块 / category color swatch
      const cat = document.createElement('span');
      cat.className = 'method-category';
      cat.style.backgroundColor = CATEGORY_COLORS[m.category] || '#808080';
      cat.style.display = 'inline-block';
      cat.style.width = '12px';
      cat.style.height = '12px';
      cat.style.borderRadius = '2px';
      cat.style.verticalAlign = 'middle';

      // 方法名 / method name
      const name = document.createElement('span');
      name.className = 'method-name';
      name.textContent = m.name;

      // 预测值 / prediction
      const val = document.createElement('span');
      val.className = 'method-value';
      val.textContent = (m.prediction === null || m.prediction === undefined)
        ? '数据不足'
        : formatNumber(m.prediction);

      // 权重百分比 / weight percentage
      const w = document.createElement('span');
      w.className = 'method-weight';
      w.textContent = ((state.weights[i] || 0) * 100).toFixed(2) + '%';

      // MAPE 回测误差 / backtest MAPE
      const mapeEl = document.createElement('span');
      mapeEl.className = 'method-mape';
      if (m.mape === Infinity || !Number.isFinite(m.mape)) {
        mapeEl.textContent = '—';
      } else {
        mapeEl.textContent = (m.mape * 100).toFixed(2) + '%';
      }

      item.appendChild(cat);
      item.appendChild(name);
      item.appendChild(val);
      item.appendChild(w);
      item.appendChild(mapeEl);
      el.appendChild(item);
    }
  }

  /**
   * renderLineChart()
   * 渲染折线图。
   */
  function renderLineChart() {
    const canvas = document.getElementById('line-chart');
    if (!canvas) return;
    drawLineChart(canvas, state.series, state.ensemble, state.stats);
  }

  /**
   * renderWeightBars()
   * 渲染权重条形图。
   */
  function renderWeightBars() {
    const canvas = document.getElementById('weight-chart');
    if (!canvas) return;
    drawWeightBars(canvas, state.stats, state.weights);
  }

  // ============================================================
  // Part 4: 权重模式切换 / Weight Mode Toggle
  // ============================================================

  /**
   * onWeightModeChange()
   * 切换权重模式后重新计算权重与融合预测并重渲染。
   */
  function onWeightModeChange() {
    const checked = document.querySelector('input[name="weight-mode"]:checked');
    if (!checked) return;
    state.weightMode = checked.value;
    if (state.series.length === 0) return; // 无数据可重算
    state.weights = getCurrentWeights();
    state.ensemble = ensemblePredict(
      state.stats.map(function (s) { return s.prediction; }),
      state.weights
    );
    renderAll();
  }

  // ============================================================
  // Part 5: 重置 / Reset
  // ============================================================

  /**
   * clearCanvas(canvas)
   * 清空画布内容（防御性，canvas / ctx 缺失则跳过）。
   */
  function clearCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * resetAll()
   * 重置全部状态与 UI。
   */
  function resetAll() {
    const textarea = document.getElementById('input-series');
    if (textarea) textarea.value = '';

    state.series = [];
    state.stats = [];
    state.weights = [];
    state.ensemble = null;

    const ensembleEl = document.getElementById('ensemble-result');
    if (ensembleEl) ensembleEl.textContent = '— 等待输入 —';

    const listEl = document.getElementById('method-list');
    if (listEl) {
      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
      const empty = document.createElement('div');
      empty.textContent = '— 等待预测 —';
      listEl.appendChild(empty);
    }

    clearCanvas(document.getElementById('line-chart'));
    clearCanvas(document.getElementById('weight-chart'));

    showToast('已重置');
  }

  // ============================================================
  // Part 6: 数据导出 / Data Export
  // ============================================================

  /**
   * getTimestamp() → string
   * 返回 YYYYMMDDHHMMSS 格式时间戳（每段补零至 2 位）。
   */
  function getTimestamp() {
    const d = new Date();
    const pad = function (n) {
      const s = String(n);
      return s.length < 2 ? '0' + s : s;
    };
    return '' +
      d.getFullYear() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds());
  }

  /**
   * downloadBlob(blob, filename)
   * 通过临时 <a> 触发文件下载，并释放对象 URL。
   */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 100);
  }

  /**
   * csvEscape(s) → string
   * CSV 字段转义：包含逗号 / 引号 / 换行时用双引号包裹，内部引号双写。
   */
  function csvEscape(s) {
    if (s === null || s === undefined) return '';
    s = String(s);
    if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 ||
        s.indexOf('\n') !== -1 || s.indexOf('\r') !== -1) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  /**
   * exportJSON()
   * 导出预测结果为 JSON 文件。
   */
  function exportJSON() {
    if (state.series.length === 0) {
      showToast('请先输入并预测');
      return;
    }
    const obj = {
      timestamp: new Date().toISOString(),
      input: state.series,
      weightMode: state.weightMode,
      ensemblePrediction: state.ensemble,
      methods: state.stats.map(function (s, i) {
        return {
          id: s.id,
          name: s.name,
          category: s.category,
          prediction: s.prediction,
          weight: state.weights[i],
          mape: (s.mape === Infinity || !Number.isFinite(s.mape)) ? null : s.mape
        };
      })
    };
    const json = JSON.stringify(obj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, 'prediction_' + getTimestamp() + '.json');
    showToast('已导出 JSON');
  }

  /**
   * exportCSV()
   * 导出预测结果为 CSV 文件。
   * 表头：id,name,category,prediction,weight,mape
   * 末行追加 ENSEMBLE 汇总（weight=1）。
   */
  function exportCSV() {
    if (state.series.length === 0) {
      showToast('请先输入并预测');
      return;
    }
    const rows = [];
    rows.push('id,name,category,prediction,weight,mape');
    for (let i = 0; i < state.stats.length; i++) {
      const s = state.stats[i];
      const w = state.weights[i];
      const predStr = (s.prediction === null || s.prediction === undefined)
        ? '' : String(s.prediction);
      const wStr = (typeof w === 'number' && Number.isFinite(w))
        ? w.toFixed(6) : '';
      const mapeStr = (s.mape === Infinity || !Number.isFinite(s.mape))
        ? '' : s.mape.toFixed(6);
      rows.push(
        csvEscape(s.id) + ',' +
        csvEscape(s.name) + ',' +
        csvEscape(s.category) + ',' +
        csvEscape(predStr) + ',' +
        csvEscape(wStr) + ',' +
        csvEscape(mapeStr)
      );
    }
    // 集成行：id=ENSEMBLE, name=ENSEMBLE, category=空, prediction=集成值, weight=1, mape=空
    const ensembleStr = (state.ensemble !== null && state.ensemble !== undefined)
      ? String(state.ensemble) : '';
    rows.push('ENSEMBLE,ENSEMBLE,,' + ensembleStr + ',1,');
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, 'prediction_' + getTimestamp() + '.csv');
    showToast('已导出 CSV');
  }

  // ============================================================
  // Part 7: 窗口尺寸变化 / Resize Handler
  // ============================================================

  /**
   * onResize()
   * 窗口尺寸变化时防抖（150ms）重绘图表。
   */
  function onResize() {
    if (resizeTimeout !== null) {
      clearTimeout(resizeTimeout);
      resizeTimeout = null;
    }
    resizeTimeout = setTimeout(function () {
      resizeTimeout = null;
      if (state.series.length > 0) {
        renderLineChart();
        renderWeightBars();
      }
    }, 150);
  }

  // ============================================================
  // Part 8: 初始化 / Initialization
  // ============================================================

  /**
   * init()
   * 绑定事件监听并设置初始 UI 状态。
   */
  function init() {
    // 按钮事件 / button listeners
    const btnPredict = document.getElementById('btn-predict');
    const btnReset = document.getElementById('btn-reset');
    const btnExportJson = document.getElementById('btn-export-json');
    const btnExportCsv = document.getElementById('btn-export-csv');

    if (btnPredict) btnPredict.addEventListener('click', runPrediction);
    if (btnReset) btnReset.addEventListener('click', resetAll);
    if (btnExportJson) btnExportJson.addEventListener('click', exportJSON);
    if (btnExportCsv) btnExportCsv.addEventListener('click', exportCSV);

    // 权重模式单选 / weight-mode radio listeners
    const radios = document.querySelectorAll('input[name="weight-mode"]');
    for (let i = 0; i < radios.length; i++) {
      radios[i].addEventListener('change', onWeightModeChange);
    }

    // 窗口尺寸变化 / window resize
    window.addEventListener('resize', onResize);

    // 输入框回车触发预测（Shift+Enter 换行）/ Enter to predict
    const textarea = document.getElementById('input-series');
    if (textarea) {
      textarea.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          runPrediction();
        }
      });
    }

    // 初始 UI 状态 / initial UI state
    const ensembleEl = document.getElementById('ensemble-result');
    if (ensembleEl) ensembleEl.textContent = '— 等待输入 —';

    const listEl = document.getElementById('method-list');
    if (listEl) {
      // 清空可能存在的占位文本，统一插入占位节点
      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
      const empty = document.createElement('div');
      empty.textContent = '— 等待预测 —';
      listEl.appendChild(empty);
    }

    console.log('[app] initialized, predictors:', predictors.length);
  }

  // ============================================================
  // 启动 / Startup
  // ============================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================================
  // 自检 / Self-test
  // ============================================================
  console.log('[app] script loaded');
})();
