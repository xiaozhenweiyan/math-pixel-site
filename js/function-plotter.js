/**
 * function-plotter.js
 * 函数系统 / Function Plotter
 * 平面直角坐标系 + 函数图像绘制
 *
 * 功能：
 *   - 网格 + 坐标轴 + 刻度数字
 *   - 鼠标拖拽平移
 *   - 滚轮缩放（以鼠标位置为中心）
 *   - +/- 按钮缩放
 *   - 多函数叠加（不同颜色）
 *   - 支持 y=表达式 和 f(x)=表达式 格式
 *   - 支持 sin/cos/tan/log/sqrt/abs/exp + ^ 幂运算
 */
(function () {
  'use strict';

  // 调色板（像素风）
  const PLOT_COLORS = [
    '#ffd700', // 金色（主色）
    '#1e90ff', // 水蓝
    '#ff4500', // 火红
    '#228b22', // 树叶绿
    '#9370db', // 紫色
    '#ff69b4', // 粉色
    '#00ffff', // 青色
    '#ffffff'  // 白色
  ];

  class FunctionPlotter {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.originX = 0;  // 原点像素坐标（相对 canvas 左上）
      this.originY = 0;
      this.scale = 40;   // 单位长度像素数
      this.functions = [];  // [{ expr, fn, color, input }]
      this.dragging = false;
      this.lastMouseX = 0;
      this.lastMouseY = 0;
      this.colorIndex = 0;
      this._originInitialized = false;

      this.resize();
      this.bindEvents();
      const self = this;
      window.addEventListener('resize', function () {
        self.resize();
        self.redraw();
      });
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      const cssW = Math.max(1, rect.width);
      const cssH = Math.max(1, rect.height);
      this.canvas.width = Math.floor(cssW * dpr);
      this.canvas.height = Math.floor(cssH * dpr);
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
      this.width = cssW;
      this.height = cssH;
      // 原点默认居中
      if (!this._originInitialized) {
        this.originX = this.width / 2;
        this.originY = this.height / 2;
        this._originInitialized = true;
      }
    }

    // 坐标转换：数学坐标 → 像素坐标
    toPixelX(mathX) { return this.originX + mathX * this.scale; }
    toPixelY(mathY) { return this.originY - mathY * this.scale; }
    // 像素坐标 → 数学坐标
    toMathX(px) { return (px - this.originX) / this.scale; }
    toMathY(py) { return (this.originY - py) / this.scale; }

    drawGrid() {
      const ctx = this.ctx;
      const w = this.width, h = this.height;
      // 网格线：每 1 单位一条
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      // 垂直网格线（沿 x 方向）
      const xStart = Math.floor(this.toMathX(0));
      const xEnd = Math.ceil(this.toMathX(w));
      for (let x = xStart; x <= xEnd; x++) {
        const px = this.toPixelX(x);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, h);
        ctx.stroke();
      }
      // 水平网格线（沿 y 方向）
      const yStart = Math.floor(this.toMathY(h));
      const yEnd = Math.ceil(this.toMathY(0));
      for (let y = yStart; y <= yEnd; y++) {
        const py = this.toPixelY(y);
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(w, py);
        ctx.stroke();
      }
    }

    drawAxes() {
      const ctx = this.ctx;
      const w = this.width, h = this.height;
      // 坐标轴（白色 2px）
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      // x 轴（y=0 的水平线）
      const xAxisY = this.toPixelY(0);
      if (xAxisY >= 0 && xAxisY <= h) {
        ctx.beginPath();
        ctx.moveTo(0, xAxisY);
        ctx.lineTo(w, xAxisY);
        ctx.stroke();
        // x 轴箭头
        ctx.beginPath();
        ctx.moveTo(w - 8, xAxisY - 4);
        ctx.lineTo(w, xAxisY);
        ctx.lineTo(w - 8, xAxisY + 4);
        ctx.stroke();
      }
      // y 轴（x=0 的垂直线）
      const yAxisX = this.toPixelX(0);
      if (yAxisX >= 0 && yAxisX <= w) {
        ctx.beginPath();
        ctx.moveTo(yAxisX, 0);
        ctx.lineTo(yAxisX, h);
        ctx.stroke();
        // y 轴箭头
        ctx.beginPath();
        ctx.moveTo(yAxisX - 4, 8);
        ctx.lineTo(yAxisX, 0);
        ctx.lineTo(yAxisX + 4, 8);
        ctx.stroke();
      }
      // 原点标记 "O"
      if (yAxisX >= 0 && yAxisX <= w && xAxisY >= 0 && xAxisY <= h) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('O', yAxisX - 4, xAxisY + 4);
      }
      // 刻度数字
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      // x 轴刻度
      const xStart = Math.floor(this.toMathX(0));
      const xEnd = Math.ceil(this.toMathX(w));
      for (let x = xStart; x <= xEnd; x++) {
        if (x === 0) continue;
        const px = this.toPixelX(x);
        if (px < 0 || px > w) continue;
        if (xAxisY >= 0 && xAxisY <= h) {
          ctx.fillText(String(x), px, xAxisY + 4);
        } else if (xAxisY < 0) {
          ctx.fillText(String(x), px, 4);
        } else {
          ctx.fillText(String(x), px, h - 16);
        }
      }
      // y 轴刻度
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const yStart = Math.floor(this.toMathY(h));
      const yEnd = Math.ceil(this.toMathY(0));
      for (let y = yStart; y <= yEnd; y++) {
        if (y === 0) continue;
        const py = this.toPixelY(y);
        if (py < 0 || py > h) continue;
        if (yAxisX >= 0 && yAxisX <= w) {
          ctx.fillText(String(y), yAxisX - 4, py);
        } else if (yAxisX < 0) {
          ctx.fillText(String(y), w - 4, py);
        } else {
          ctx.fillText(String(y), 36, py);
        }
      }
      // 轴标签 x / y
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      if (xAxisY >= 0 && xAxisY <= h) {
        ctx.fillText('x', w - 8, xAxisY - 12);
      }
      ctx.textAlign = 'left';
      if (yAxisX >= 0 && yAxisX <= w) {
        ctx.fillText('y', yAxisX + 8, 12);
      }
    }

    plotFunction(fn, color) {
      const ctx = this.ctx;
      const w = this.width, h = this.height;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      let lastY = null;
      for (let px = 0; px <= w; px += 1) {
        const mathX = this.toMathX(px);
        let mathY;
        try {
          mathY = fn(mathX);
        } catch (e) {
          started = false;
          continue;
        }
        if (!isFinite(mathY)) {
          started = false;
          continue;
        }
        const py = this.toPixelY(mathY);
        // 防止函数值过大导致线段跨越整个画面（如 tan 在 π/2 附近）
        if (lastY !== null && Math.abs(py - lastY) > h) {
          started = false;
        }
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
        lastY = py;
      }
      ctx.stroke();
    }

    redraw() {
      const ctx = this.ctx;
      // 清空（深空背景）
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, this.width, this.height);
      this.drawGrid();
      this.drawAxes();
      // 绘制所有函数
      for (let i = 0; i < this.functions.length; i++) {
        this.plotFunction(this.functions[i].fn, this.functions[i].color);
      }
    }

    // 解析函数输入
    // 支持 y=表达式 或 f(x)=表达式
    parseFunction(input) {
      let expr = (input || '').trim();
      if (!expr) return { ok: false, error: '空输入' };
      // 去除 y= 或 f(x)= 前缀
      expr = expr.replace(/^y\s*=\s*/i, '');
      expr = expr.replace(/^f\s*\(\s*x\s*\)\s*=\s*/i, '');
      if (!expr) return { ok: false, error: '表达式为空' };
      // 预处理：^ → **，sin/cos/tan/log/sqrt/abs/exp → Math.xxx
      let safe = expr;
      // 先把 Math.xxx 临时替换保护
      safe = safe.replace(/Math\./g, '__MATHDOT__');
      // ^ → **
      safe = safe.replace(/\^/g, '**');
      // 函数名替换
      const funcs = ['sin', 'cos', 'tan', 'log', 'sqrt', 'abs', 'exp', 'asin', 'acos', 'atan'];
      for (let i = 0; i < funcs.length; i++) {
        const re = new RegExp('\\b' + funcs[i] + '\\b', 'g');
        safe = safe.replace(re, 'Math.' + funcs[i]);
      }
      // 常量
      safe = safe.replace(/\bPI\b/g, 'Math.PI');
      safe = safe.replace(/\bE\b/g, 'Math.E');
      // 恢复 Math.
      safe = safe.replace(/__MATHDOT__/g, 'Math.');
      // 字符白名单校验（移除函数名后）
      const checkStr = safe.replace(/Math\.(sin|cos|tan|log|sqrt|abs|exp|asin|acos|atan|PI|E)/g, '').replace(/\*\*/g, '');
      if (!/^[-+*/().0-9x\s]*$/.test(checkStr)) {
        return { ok: false, error: '包含非法字符' };
      }
      // 构造函数
      try {
        const fn = new Function('x', 'with (Math) { return ' + safe + '; }');
        // 测试求值
        const testVal = fn(1);
        if (typeof testVal !== 'number') return { ok: false, error: '结果不是数字' };
        return { ok: true, fn: fn, expr: safe };
      } catch (e) {
        return { ok: false, error: '表达式错误：' + e.message };
      }
    }

    addFunction(input) {
      const result = this.parseFunction(input);
      if (!result.ok) return { ok: false, error: result.error };
      const color = PLOT_COLORS[this.colorIndex % PLOT_COLORS.length];
      this.colorIndex++;
      this.functions.push({
        input: input.trim(),
        expr: result.expr,
        fn: result.fn,
        color: color
      });
      this.redraw();
      return { ok: true, color: color, expr: result.expr };
    }

    removeFunction(index) {
      if (index < 0 || index >= this.functions.length) return;
      this.functions.splice(index, 1);
      this.colorIndex = Math.max(0, this.colorIndex - 1);
      this.redraw();
    }

    clearFunctions() {
      this.functions = [];
      this.colorIndex = 0;
      this.redraw();
    }

    bindEvents() {
      const self = this;
      // 鼠标拖拽平移
      this.canvas.addEventListener('mousedown', function (e) {
        self.dragging = true;
        self.lastMouseX = e.clientX;
        self.lastMouseY = e.clientY;
      });
      window.addEventListener('mousemove', function (e) {
        if (!self.dragging) return;
        const dx = e.clientX - self.lastMouseX;
        const dy = e.clientY - self.lastMouseY;
        self.originX += dx;
        self.originY += dy;
        self.lastMouseX = e.clientX;
        self.lastMouseY = e.clientY;
        self.redraw();
      });
      window.addEventListener('mouseup', function () {
        self.dragging = false;
      });
      // 滚轮缩放（以鼠标位置为中心）
      this.canvas.addEventListener('wheel', function (e) {
        e.preventDefault();
        const rect = self.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        // 鼠标位置的数学坐标
        const mathX = self.toMathX(mx);
        const mathY = self.toMathY(my);
        // 调整 scale
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        self.scale = Math.max(10, Math.min(200, self.scale * factor));
        // 调整原点使鼠标位置的数学坐标不变
        self.originX = mx - mathX * self.scale;
        self.originY = my + mathY * self.scale;
        self.redraw();
      });
    }

    zoomByButton(delta) {
      // 以 canvas 中心为缩放中心
      const cx = this.width / 2;
      const cy = this.height / 2;
      const mathX = this.toMathX(cx);
      const mathY = this.toMathY(cy);
      this.scale = Math.max(10, Math.min(200, this.scale + delta));
      this.originX = cx - mathX * this.scale;
      this.originY = cy + mathY * this.scale;
      this.redraw();
    }
  }

  // 暴露到全局
  window.FunctionPlotter = FunctionPlotter;
})();
