/**
 * pixel-art.js
 * 像素艺术生成器 / Pixel Art Generator
 *
 * 依赖：p5.js 1.7.0+（CDN 加载）
 * 算法哲学：像素深空 Pixel Deep Space
 *   - 复古 8-bit 星空 + 像素几何美 + 深空粒子流
 *   - 种子化随机：相同种子产生相同图像
 *   - 4 种模式：flow / particles / mosaic / spiral
 *
 * 渲染策略：
 *   - 低分辨率画布（resolution × resolution，默认 32×32）
 *   - CSS image-rendering: pixelated 放大到 600px 显示
 *   - HSB 色彩模式，调色板基于色相参数生成
 */
(function () {
  'use strict';

  // ============================================================
  // 模块状态 / Module State
  // ============================================================
  let p5Instance = null;
  let currentSeed = 1;
  let currentMode = 'flow';
  let resolution = 48;
  let density = 50;
  let hue = 45;
  let isAnimating = false;

  // 粒子状态（流场 / 粒子模式共用）/ particle state
  let particles = [];

  // ============================================================
  // 调色板生成 / Palette Generation (HSB)
  // ============================================================
  /**
   * generatePalette(baseHue) → [{h,s,b}, ...]
   * 基于基础色相生成 8 色调色板，包含主色、邻色、互补色、三元色。
   * 调色板不含深空背景色（背景单独用 p.background 绘制）。
   */
  function generatePalette(baseHue) {
    const h = ((baseHue % 360) + 360) % 360;
    return [
      { h: h,                       s: 85, b: 95 }, // 主色亮
      { h: (h + 25) % 360,          s: 80, b: 80 }, // 邻色 1
      { h: (h + 55) % 360,          s: 90, b: 70 }, // 邻色 2
      { h: (h - 25 + 360) % 360,    s: 75, b: 95 }, // 邻色 3
      { h: (h - 55 + 360) % 360,    s: 85, b: 75 }, // 邻色 4
      { h: (h + 180) % 360,         s: 70, b: 90 }, // 互补色
      { h: (h + 120) % 360,         s: 80, b: 85 }, // 三元色 1
      { h: (h + 90) % 360,          s: 95, b: 90 }  // 三元色 2
    ];
  }

  // ============================================================
  // p5.js Sketch（实例模式）/ Instance Mode Sketch
  // ============================================================
  function createSketch() {
    return function (p) {
      let palette = null;

      p.setup = function () {
        p.createCanvas(resolution, resolution);
        p.noSmooth();
        p.pixelDensity(1);
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.noStroke();
        p.noLoop();
        palette = generatePalette(hue);
        regenerate();
      };

      p.draw = function () {
        if (!isAnimating) return;
        if (currentMode === 'flow') {
          stepFlow(true);
        } else if (currentMode === 'particles') {
          stepParticles(true);
        }
      };

      /**
       * regenerate()
       * 重置种子 + 背景 + 调色板，按当前模式重绘。
       * 动画模式下不预渲染（由 draw 循环逐帧绘制）。
       */
      function regenerate() {
        p.randomSeed(currentSeed);
        p.noiseSeed(currentSeed);
        palette = generatePalette(hue);
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.noStroke();
        // 深空背景 #1a1a2e ≈ HSB(240, 43, 18)
        p.background(240, 43, 18);

        if (currentMode === 'flow') {
          initFlow();
          if (!isAnimating) {
            // 静态预渲染：跑若干步以呈现完整图像
            for (let i = 0; i < 100; i++) stepFlow(false);
          }
        } else if (currentMode === 'particles') {
          initParticles();
          if (!isAnimating) {
            for (let i = 0; i < 80; i++) stepParticles(false);
          }
        } else if (currentMode === 'mosaic') {
          drawMosaic();
        } else if (currentMode === 'spiral') {
          drawSpiral();
        }
      }

      // ============================================================
      // 模式 1：流场 Flow Field（Perlin 噪声向量场 + 粒子轨迹）
      // ============================================================
      function initFlow() {
        particles = [];
        const count = Math.max(8, Math.floor(density * 1.2));
        for (let i = 0; i < count; i++) {
          particles.push({
            x: p.random(resolution),
            y: p.random(resolution),
            life: Math.floor(p.random(30, 90)),
            colorIdx: Math.floor(p.random(palette.length))
          });
        }
      }

      /**
       * stepFlow(animated)
       * 每步：用 Perlin 噪声采样粒子位置的向量角度，粒子沿向量移动并留下 1px 轨迹。
       * animated=true 时叠加半透明背景产生淡出拖尾；false 时纯累积。
       */
      function stepFlow(animated) {
        if (animated) {
          // 半透明背景叠加，产生拖尾淡出
          p.noStroke();
          p.fill(240, 43, 18, 18);
          p.rect(0, 0, resolution, resolution);
        }
        p.strokeWeight(1);
        for (let i = 0; i < particles.length; i++) {
          const pt = particles[i];
          // 双层噪声：主向量场 + 微扰
          const n = p.noise(pt.x * 0.10, pt.y * 0.10);
          const n2 = p.noise(pt.x * 0.25 + 100, pt.y * 0.25 + 100);
          const angle = (n + n2 * 0.3) * p.TWO_PI * 2;
          const speed = 0.75;
          const nx = pt.x + Math.cos(angle) * speed;
          const ny = pt.y + Math.sin(angle) * speed;

          const c = palette[pt.colorIdx];
          p.stroke(c.h, c.s, c.b, animated ? 85 : 95);
          p.line(Math.floor(pt.x), Math.floor(pt.y), Math.floor(nx), Math.floor(ny));

          pt.x = nx;
          pt.y = ny;
          pt.life--;

          if (pt.life <= 0 || pt.x < 0 || pt.x >= resolution || pt.y < 0 || pt.y >= resolution) {
            pt.x = p.random(resolution);
            pt.y = p.random(resolution);
            pt.life = Math.floor(p.random(30, 90));
            pt.colorIdx = Math.floor(p.random(palette.length));
          }
        }
        p.noStroke();
      }

      // ============================================================
      // 模式 2：粒子系统 Particles（中心爆发 + 重力 + 寿命淡出）
      // ============================================================
      function initParticles() {
        particles = [];
        const count = Math.max(10, Math.floor(density * 1.5));
        for (let i = 0; i < count; i++) {
          particles.push(makeParticle());
        }
      }

      function makeParticle() {
        // 多个爆发中心，增加视觉层次 / multiple burst centers
        const centers = [
          { x: resolution * 0.5, y: resolution * 0.5 },
          { x: resolution * 0.25, y: resolution * 0.3 },
          { x: resolution * 0.75, y: resolution * 0.7 }
        ];
        const center = centers[Math.floor(p.random(centers.length))];
        const angle = p.random(p.TWO_PI);
        const speed = p.random(0.25, 1.4);
        return {
          x: center.x,
          y: center.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: Math.floor(p.random(15, 45)),
          maxLife: 45,
          colorIdx: Math.floor(p.random(palette.length))
        };
      }

      /**
       * stepParticles(animated)
       * 每步：粒子受重力影响移动，按寿命降低 alpha 绘制 1px 方块。
       * animated=true 时叠加半透明背景产生拖尾。
       */
      function stepParticles(animated) {
        if (animated) {
          p.noStroke();
          p.fill(240, 43, 18, 22);
          p.rect(0, 0, resolution, resolution);
        }
        const gravity = 0.04;
        for (let i = 0; i < particles.length; i++) {
          const pt = particles[i];
          pt.vy += gravity;
          // 微弱阻力
          pt.vx *= 0.99;
          pt.vy *= 0.99;
          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.life--;

          if (pt.x >= 0 && pt.x < resolution && pt.y >= 0 && pt.y < resolution) {
            const c = palette[pt.colorIdx];
            const alpha = Math.max(20, Math.min(100, (pt.life / pt.maxLife) * 100));
            p.fill(c.h, c.s, c.b, alpha);
            p.rect(Math.floor(pt.x), Math.floor(pt.y), 1, 1);
          }

          // 重生
          if (pt.life <= 0 || pt.x < -2 || pt.x > resolution + 2 || pt.y > resolution + 2) {
            const np = makeParticle();
            pt.x = np.x;
            pt.y = np.y;
            pt.vx = np.vx;
            pt.vy = np.vy;
            pt.life = np.life;
            pt.maxLife = np.maxLife;
            pt.colorIdx = np.colorIdx;
          }
        }
        p.noStroke();
      }

      // ============================================================
      // 模式 3：几何马赛克 Mosaic（递归矩形分割 + 金色高光）
      // ============================================================
      function drawMosaic() {
        const minSize = Math.max(2, Math.floor(resolution / 12));
        // 先填一层底色（比背景稍亮的深空色）
        p.fill(240, 35, 12);
        p.rect(0, 0, resolution, resolution);
        splitRect(0, 0, resolution, resolution, 0, minSize);
        // 撒一些金色像素星点 / sprinkle gold pixel stars
        const starCount = Math.floor(density * 0.4);
        for (let i = 0; i < starCount; i++) {
          const sx = Math.floor(p.random(resolution));
          const sy = Math.floor(p.random(resolution));
          p.fill(45, 100, 100);
          p.rect(sx, sy, 1, 1);
        }
      }

      /**
       * splitRect(x, y, w, h, depth, minSize)
       * 递归二分矩形：随机方向分割，叶节点填充调色板色或金色。
       * 部分叶节点保留深空色作为"网格缝隙"。
       */
      function splitRect(x, y, w, h, depth, minSize) {
        const canSplit = (w > minSize * 2 || h > minSize * 2) && depth < 7;
        const shouldSplit = canSplit && p.random() < 0.82;

        if (!shouldSplit) {
          // 叶节点：决定填充类型
          const r = p.random();
          if (r < 0.12) {
            // 金色高光块
            p.fill(45, 100, 100);
          } else if (r < 0.20) {
            // 深空留白（作为缝隙）
            p.fill(240, 43, 18);
          } else if (r < 0.28) {
            // 白色亮点
            p.fill(0, 0, 100);
          } else {
            // 调色板色
            const c = palette[Math.floor(p.random(palette.length))];
            p.fill(c.h, c.s, c.b);
          }
          p.rect(x, y, w, h);
          return;
        }

        // 选择分割方向
        let splitVertical;
        if (w > h * 1.3) splitVertical = true;
        else if (h > w * 1.3) splitVertical = false;
        else splitVertical = p.random() < 0.5;

        if (splitVertical && w > minSize * 2) {
          const split = Math.floor(p.random(minSize, w - minSize));
          splitRect(x, y, split, h, depth + 1, minSize);
          splitRect(x + split, y, w - split, h, depth + 1, minSize);
        } else if (h > minSize * 2) {
          const split = Math.floor(p.random(minSize, h - minSize));
          splitRect(x, y, w, split, depth + 1, minSize);
          splitRect(x, y + split, w, h - split, depth + 1, minSize);
        } else {
          // 无法分割，填充
          const c = palette[Math.floor(p.random(palette.length))];
          p.fill(c.h, c.s, c.b);
          p.rect(x, y, w, h);
        }
      }

      // ============================================================
      // 模式 4：螺旋 Spiral（阿基米德螺旋 + 多臂 + 色相渐变）
      // ============================================================
      function drawSpiral() {
        const cx = resolution / 2;
        const cy = resolution / 2;
        const arms = Math.max(1, Math.min(6, Math.floor(density / 18)));
        const maxRadius = resolution * 0.48;
        const turns = 5;
        const stepsPerArm = Math.max(40, Math.floor(density * 3));
        const b = maxRadius / (turns * p.TWO_PI);

        // 背景星点
        const starCount = Math.floor(density * 0.3);
        for (let i = 0; i < starCount; i++) {
          const sx = Math.floor(p.random(resolution));
          const sy = Math.floor(p.random(resolution));
          p.fill(0, 0, 100, 60);
          p.rect(sx, sy, 1, 1);
        }

        for (let arm = 0; arm < arms; arm++) {
          const armOffset = (arm / arms) * p.TWO_PI;
          for (let i = 0; i < stepsPerArm; i++) {
            const t = i / stepsPerArm;
            const theta = t * turns * p.TWO_PI;
            const r = b * theta;
            if (r > maxRadius) break;
            const x = cx + Math.cos(theta + armOffset) * r;
            const y = cy + Math.sin(theta + armOffset) * r;

            if (x >= 0 && x < resolution && y >= 0 && y < resolution) {
              // 色相沿螺旋渐变
              const cIdx = (Math.floor(t * palette.length) + arm) % palette.length;
              const c = palette[cIdx];
              // 越靠近中心越亮，边缘略暗
              const brightness = 70 + (1 - t) * 30;
              p.fill(c.h, c.s, Math.min(100, brightness), 90);
              // 像素方块大小：偶有 2px 块增加质感
              const size = (p.random() < 0.15) ? 2 : 1;
              p.rect(Math.floor(x), Math.floor(y), size, size);
            }
          }
        }

        // 中心金色核心
        p.fill(45, 100, 100);
        p.rect(Math.floor(cx) - 1, Math.floor(cy) - 1, 2, 2);
        p.fill(45, 80, 100, 70);
        p.rect(Math.floor(cx) - 2, Math.floor(cy) - 2, 4, 4);
      }

      // ============================================================
      // 公开方法（挂到 p5 实例上供外部调用）
      // ============================================================
      p.regenerate = regenerate;

      p.startAnimation = function () {
        if (currentMode !== 'flow' && currentMode !== 'particles') return false;
        isAnimating = true;
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.background(240, 43, 18);
        p.noStroke();
        if (currentMode === 'flow') initFlow();
        else if (currentMode === 'particles') initParticles();
        p.loop();
        return true;
      };

      p.stopAnimation = function () {
        isAnimating = false;
        p.noLoop();
      };

      p.isAnimating = function () { return isAnimating; };

      /**
       * downloadPNG() → dataURL
       * 导出高分辨率 PNG（放大 16 倍，保持像素风）。
       */
      p.downloadPNG = function () {
        const scale = 16;
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = resolution * scale;
        tmpCanvas.height = resolution * scale;
        const ctx = tmpCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.imageSmoothingQuality = 'low';
        ctx.drawImage(p.canvas, 0, 0, resolution * scale, resolution * scale);
        return tmpCanvas.toDataURL('image/png');
      };
    };
  }

  // ============================================================
  // 初始化 / Initialization
  // ============================================================
  function init() {
    const container = document.getElementById('pixel-art-canvas-container');
    if (!container) {
      console.warn('[pixel-art] container #pixel-art-canvas-container not found');
      return;
    }
    if (typeof p5 === 'undefined') {
      console.warn('[pixel-art] p5.js not loaded');
      return;
    }
    // 清空容器（避免重复初始化残留）
    while (container.firstChild) container.removeChild(container.firstChild);
    p5Instance = new p5(createSketch(), container);
    bindControls();
  }

  function regenerate() {
    if (p5Instance && p5Instance.regenerate) {
      p5Instance.regenerate();
    }
  }

  function toggleAnimation() {
    if (!p5Instance) return;
    if (isAnimating) {
      // 停止动画，重新静态渲染
      p5Instance.stopAnimation();
      isAnimating = false;
      regenerate();
      updateAnimateBtn(false);
      return;
    }
    // 启动动画
    if (currentMode !== 'flow' && currentMode !== 'particles') {
      showToast('该模式不支持动画播放（仅流场和粒子模式支持）');
      return;
    }
    const ok = p5Instance.startAnimation();
    if (ok) {
      isAnimating = true;
      updateAnimateBtn(true);
    }
  }

  function updateAnimateBtn(animating) {
    const btn = document.getElementById('art-animate');
    if (btn) btn.textContent = animating ? '停止动画' : '动画播放';
  }

  function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    if (window.PixelArtToastTimer) {
      clearTimeout(window.PixelArtToastTimer);
    }
    window.PixelArtToastTimer = setTimeout(function () {
      el.style.display = 'none';
    }, 2200);
  }

  // ============================================================
  // 控件绑定 / Bind Controls
  // ============================================================
  function bindControls() {
    // 种子控制
    const seedInput = document.getElementById('art-seed');
    const seedPrev = document.getElementById('art-seed-prev');
    const seedNext = document.getElementById('art-seed-next');
    const seedRandom = document.getElementById('art-seed-random');

    function setSeed(v) {
      v = parseInt(v, 10);
      if (isNaN(v)) v = 1;
      v = Math.max(1, Math.min(999999, v));
      currentSeed = v;
      if (seedInput) seedInput.value = v;
      regenerate();
    }

    if (seedInput) {
      seedInput.addEventListener('change', function () {
        setSeed(this.value);
      });
    }
    if (seedPrev) {
      seedPrev.addEventListener('click', function () {
        setSeed(currentSeed - 1);
      });
    }
    if (seedNext) {
      seedNext.addEventListener('click', function () {
        setSeed(currentSeed + 1);
      });
    }
    if (seedRandom) {
      seedRandom.addEventListener('click', function () {
        setSeed(Math.floor(Math.random() * 999999) + 1);
      });
    }

    // 艺术模式
    const modeSelect = document.getElementById('art-mode');
    if (modeSelect) {
      modeSelect.addEventListener('change', function () {
        // 切换模式前先停止动画
        if (isAnimating) {
          p5Instance.stopAnimation();
          isAnimating = false;
          updateAnimateBtn(false);
        }
        currentMode = this.value;
        regenerate();
      });
    }

    // 分辨率滑块
    const resInput = document.getElementById('art-resolution');
    const resValue = document.getElementById('art-resolution-value');
    if (resInput) {
      resInput.addEventListener('input', function () {
        resolution = parseInt(this.value, 10) || 48;
        if (resValue) resValue.textContent = resolution;
      });
      // change 事件再重建画布（避免拖动过程中频繁重建）
      resInput.addEventListener('change', function () {
        if (p5Instance) {
          p5Instance.resizeCanvas(resolution, resolution);
          regenerate();
        }
      });
    }

    // 密度滑块
    const densityInput = document.getElementById('art-density');
    const densityValue = document.getElementById('art-density-value');
    if (densityInput) {
      densityInput.addEventListener('input', function () {
        density = parseInt(this.value, 10) || 50;
        if (densityValue) densityValue.textContent = density;
      });
      densityInput.addEventListener('change', function () {
        regenerate();
      });
    }

    // 色相滑块
    const hueInput = document.getElementById('art-hue');
    const hueValue = document.getElementById('art-hue-value');
    if (hueInput) {
      hueInput.addEventListener('input', function () {
        hue = parseInt(this.value, 10) || 45;
        if (hueValue) hueValue.textContent = hue;
      });
      hueInput.addEventListener('change', function () {
        regenerate();
      });
    }

    // 重新生成按钮
    const regenBtn = document.getElementById('art-regenerate');
    if (regenBtn) {
      regenBtn.addEventListener('click', function () {
        if (isAnimating) {
          p5Instance.stopAnimation();
          isAnimating = false;
          updateAnimateBtn(false);
        }
        regenerate();
        showToast('已重新生成');
      });
    }

    // 下载 PNG
    const downloadBtn = document.getElementById('art-download');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        if (!p5Instance || !p5Instance.downloadPNG) return;
        try {
          const dataUrl = p5Instance.downloadPNG();
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = 'pixel-art-' + currentMode + '-seed' + currentSeed + '-' + resolution + 'px.png';
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showToast('已下载 PNG (' + (resolution * 16) + '×' + (resolution * 16) + ')');
        } catch (e) {
          showToast('下载失败：' + (e.message || '未知错误'));
        }
      });
    }

    // 动画播放按钮
    const animateBtn = document.getElementById('art-animate');
    if (animateBtn) {
      animateBtn.addEventListener('click', toggleAnimation);
    }
  }

  // ============================================================
  // 导出 / Export
  // ============================================================
  window.PixelArt = {
    init: init,
    regenerate: regenerate
  };
})();

// 页面加载后初始化
document.addEventListener('DOMContentLoaded', function () {
  if (window.PixelArt) window.PixelArt.init();
});
