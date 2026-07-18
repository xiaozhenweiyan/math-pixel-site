/**
 * nn.js
 * 神经网络预测模块 (Neural Network Prediction Module)
 *
 * 纯 JavaScript 实现的前馈神经网络 (MLP)，用于时间序列预测。
 *
 * 特性：
 *   - 输入层大小动态取决于输入序列长度（min=2, max=8）
 *   - 渐进式训练：用前 k 个数字预测第 k+1 个，误差在 ±0.1 内才训练下一组
 *   - 像素风网络可视化动画
 *
 * 通过 <script> 标签加载，导出全局对象 `neuralNet`：
 *   {
 *     progressiveTrain(canvas, series, steps, onProgress) → Promise<number[]>
 *     predict(series, steps) → number[]
 *     drawNetwork(canvas, options)
 *     reset()
 *   }
 *
 * 视觉风格与 chart.js 一致：#1a1a2e 背景、白色 3px 边框、金色强调。
 */

const neuralNet = (function () {
  'use strict';

  // ============================================================
  // 网络配置 / Network Config
  // ============================================================
  var HIDDEN_SIZE = 8;
  var OUTPUT_SIZE = 1;
  var LEARNING_RATE = 0.05;
  var TOLERANCE = 0.1;          // 渐进训练误差容忍范围 ±0.1
  var MAX_EPOCHS_PER_STEP = 2000; // 每步最大训练 epoch
  var MIN_INPUT_SIZE = 2;
  var MAX_INPUT_SIZE = 8;

  // ============================================================
  // 动态网络参数 / Dynamic Network Parameters
  // ============================================================
  var inputSize = MIN_INPUT_SIZE;
  var params = {
    W1: [],  // inputSize × HIDDEN_SIZE
    b1: [],  // HIDDEN_SIZE
    W2: [],  // HIDDEN_SIZE × OUTPUT_SIZE
    b2: []   // OUTPUT_SIZE
  };

  var lastPrediction = null;

  // ============================================================
  // 激活函数 / Activation Functions
  // ============================================================
  function relu(x) { return x > 0 ? x : 0; }
  function reluDeriv(x) { return x > 0 ? 1 : 0; }

  // ============================================================
  // 初始化 / Initialization
  // ============================================================
  function initWeights() {
    var scale1 = Math.sqrt(2 / inputSize);
    params.W1 = [];
    for (var i = 0; i < inputSize; i++) {
      var row = [];
      for (var j = 0; j < HIDDEN_SIZE; j++) {
        row.push((Math.random() * 2 - 1) * scale1);
      }
      params.W1.push(row);
    }
    params.b1 = new Array(HIDDEN_SIZE).fill(0);

    var scale2 = Math.sqrt(2 / HIDDEN_SIZE);
    params.W2 = [];
    for (var k = 0; k < HIDDEN_SIZE; k++) {
      var row2 = [];
      for (var m = 0; m < OUTPUT_SIZE; m++) {
        row2.push((Math.random() * 2 - 1) * scale2);
      }
      params.W2.push(row2);
    }
    params.b2 = new Array(OUTPUT_SIZE).fill(0);
  }

  // ============================================================
  // 前向传播 / Forward Pass
  // ============================================================
  function forward(input) {
    var z1 = new Array(HIDDEN_SIZE);
    var a1 = new Array(HIDDEN_SIZE);
    for (var j = 0; j < HIDDEN_SIZE; j++) {
      var sum = params.b1[j];
      for (var i = 0; i < inputSize; i++) {
        sum += input[i] * params.W1[i][j];
      }
      z1[j] = sum;
      a1[j] = relu(sum);
    }

    var z2 = new Array(OUTPUT_SIZE);
    var a2 = new Array(OUTPUT_SIZE);
    for (var k = 0; k < OUTPUT_SIZE; k++) {
      var sum2 = params.b2[k];
      for (var j2 = 0; j2 < HIDDEN_SIZE; j2++) {
        sum2 += a1[j2] * params.W2[j2][k];
      }
      z2[k] = sum2;
      a2[k] = sum2; // Linear activation
    }

    return { z1: z1, a1: a1, z2: z2, a2: a2 };
  }

  // ============================================================
  // 数据归一化 / Data Normalization
  // ============================================================
  function normalizeSeries(series) {
    var n = series.length;
    if (n === 0) return { data: [], mean: 0, std: 1 };
    var sum = 0;
    for (var i = 0; i < n; i++) sum += series[i];
    var mean = sum / n;
    var sumSq = 0;
    for (var j = 0; j < n; j++) sumSq += (series[j] - mean) * (series[j] - mean);
    var std = Math.sqrt(sumSq / n);
    if (std < 1e-10) std = 1;
    var normalized = [];
    for (var k = 0; k < n; k++) normalized.push((series[k] - mean) / std);
    return { data: normalized, mean: mean, std: std };
  }

  function denormalize(val, mean, std) {
    return val * std + mean;
  }

  // ============================================================
  // 训练单个样本 / Train Single Sample (online SGD)
  // ============================================================
  function trainSample(input, target, lr) {
    var out = forward(input);

    // 反向传播 / backprop
    var dZ2 = new Array(OUTPUT_SIZE);
    for (var k = 0; k < OUTPUT_SIZE; k++) {
      dZ2[k] = out.a2[k] - target[k];
    }

    var dW2 = [];
    for (var j3 = 0; j3 < HIDDEN_SIZE; j3++) {
      var row = [];
      for (var k3 = 0; k3 < OUTPUT_SIZE; k3++) {
        row.push(out.a1[j3] * dZ2[k3]);
      }
      dW2.push(row);
    }
    var db2 = dZ2.slice();

    var dZ1 = new Array(HIDDEN_SIZE).fill(0);
    for (var j4 = 0; j4 < HIDDEN_SIZE; j4++) {
      var sum = 0;
      for (var k5 = 0; k5 < OUTPUT_SIZE; k5++) {
        sum += params.W2[j4][k5] * dZ2[k5];
      }
      dZ1[j4] = sum * reluDeriv(out.z1[j4]);
    }

    var dW1 = [];
    for (var i2 = 0; i2 < inputSize; i2++) {
      var row2 = [];
      for (var j5 = 0; j5 < HIDDEN_SIZE; j5++) {
        row2.push(input[i2] * dZ1[j5]);
      }
      dW1.push(row2);
    }
    var db1 = dZ1.slice();

    // 更新参数 / update parameters
    for (var i3 = 0; i3 < inputSize; i3++) {
      for (var j7 = 0; j7 < HIDDEN_SIZE; j7++) {
        params.W1[i3][j7] -= lr * dW1[i3][j7];
      }
    }
    for (var j8 = 0; j8 < HIDDEN_SIZE; j8++) {
      params.b1[j8] -= lr * db1[j8];
    }
    for (var j9 = 0; j9 < HIDDEN_SIZE; j9++) {
      for (var k6 = 0; k6 < OUTPUT_SIZE; k6++) {
        params.W2[j9][k6] -= lr * dW2[j9][k6];
      }
    }
    for (var k7 = 0; k7 < OUTPUT_SIZE; k7++) {
      params.b2[k7] -= lr * db2[k7];
    }

    // 返回损失 / return loss
    var loss = 0;
    for (var k8 = 0; k8 < OUTPUT_SIZE; k8++) {
      var diff = out.a2[k8] - target[k8];
      loss += diff * diff;
    }
    return loss / OUTPUT_SIZE;
  }

  // ============================================================
  // 预测 / Prediction
  // ============================================================
  function predict(series, steps) {
    if (!series || series.length < MIN_INPUT_SIZE) return [];
    steps = steps || 1;

    var norm = normalizeSeries(series);
    var normalized = norm.data.slice();
    var predictions = [];

    for (var s = 0; s < steps; s++) {
      var input = [];
      var n = normalized.length;
      for (var i = 0; i < inputSize; i++) {
        input.push(normalized[n - inputSize + i]);
      }
      var out = forward(input);
      var predNorm = out.a2[0];
      var predDenorm = denormalize(predNorm, norm.mean, norm.std);
      predictions.push(predDenorm);
      normalized.push(predNorm);
    }

    lastPrediction = predictions[0];
    return predictions;
  }

  // ============================================================
  // 网络可视化 / Network Visualization
  // ============================================================
  function setupCanvasNN(canvas) {
    if (!canvas) return null;
    var dpr = window.devicePixelRatio || 1;
    var dispW = canvas.clientWidth || 400;
    var dispH = canvas.clientHeight || 240;
    canvas.width = Math.round(dispW * dpr);
    canvas.height = Math.round(dispH * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function drawNetwork(canvas, options) {
    if (!canvas) return;
    options = options || {};
    var ctx = setupCanvasNN(canvas);
    if (!ctx) return;

    var w = canvas.clientWidth || 400;
    var h = canvas.clientHeight || 240;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    var padX = 40;
    var padY = 30;
    var plotW = w - padX * 2;
    var plotH = h - padY * 2;

    var inputY = [];
    for (var i = 0; i < inputSize; i++) {
      inputY.push(padY + (plotH / (inputSize + 1)) * (i + 1));
    }
    var hiddenY = [];
    for (var j = 0; j < HIDDEN_SIZE; j++) {
      hiddenY.push(padY + (plotH / (HIDDEN_SIZE + 1)) * (j + 1));
    }
    var outputY = [padY + plotH / 2];

    var xInput = padX + 10;
    var xHidden = padX + plotW / 2;
    var xOutput = w - padX - 10;

    var nodeR = 8;
    var pulse = options.pulse || 0;
    var inputAct = options.inputActivations || new Array(inputSize).fill(0.5);
    var hiddenAct = options.hiddenActivations || new Array(HIDDEN_SIZE).fill(0.5);
    var outputAct = options.outputActivations || new Array(OUTPUT_SIZE).fill(0.5);

    // 连接线 input → hidden
    for (var i2 = 0; i2 < inputSize; i2++) {
      for (var j2 = 0; j2 < HIDDEN_SIZE; j2++) {
        var weightVal = params.W1[i2] ? (params.W1[i2][j2] || 0) : 0;
        var intensity = Math.min(1, Math.abs(weightVal) * 2) * (0.3 + pulse * 0.4);
        var color = weightVal >= 0
          ? 'rgba(255, 215, 0, ' + intensity + ')'
          : 'rgba(30, 144, 255, ' + intensity + ')';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 + Math.abs(weightVal) * 2;
        ctx.beginPath();
        ctx.moveTo(xInput + nodeR, inputY[i2]);
        ctx.lineTo(xHidden - nodeR, hiddenY[j2]);
        ctx.stroke();
      }
    }

    // 连接线 hidden → output
    for (var j3 = 0; j3 < HIDDEN_SIZE; j3++) {
      for (var k = 0; k < OUTPUT_SIZE; k++) {
        var weightVal2 = params.W2[j3] ? (params.W2[j3][k] || 0) : 0;
        var intensity2 = Math.min(1, Math.abs(weightVal2) * 2) * (0.3 + pulse * 0.4);
        var color2 = weightVal2 >= 0
          ? 'rgba(255, 215, 0, ' + intensity2 + ')'
          : 'rgba(30, 144, 255, ' + intensity2 + ')';
        ctx.strokeStyle = color2;
        ctx.lineWidth = 1 + Math.abs(weightVal2) * 2;
        ctx.beginPath();
        ctx.moveTo(xHidden + nodeR, hiddenY[j3]);
        ctx.lineTo(xOutput - nodeR, outputY[k]);
        ctx.stroke();
      }
    }

    function drawNode(x, y, activation, label) {
      var radius = nodeR + activation * 2;
      if (activation > 0.3) {
        var glowRadius = radius + 4 + activation * 6;
        var grad = ctx.createRadialGradient(x, y, radius, x, y, glowRadius);
        grad.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
        grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
      ctx.fill();
      var bodyColor = activation > 0.5
        ? 'rgba(255, 215, 0, ' + (0.6 + activation * 0.4) + ')'
        : '#2d2d44';
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      if (label) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px "Courier New", Courier, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);
      }
    }

    for (var i3 = 0; i3 < inputSize; i3++) {
      drawNode(xInput, inputY[i3], inputAct[i3], 'x' + (i3 + 1));
    }
    for (var j4 = 0; j4 < HIDDEN_SIZE; j4++) {
      drawNode(xHidden, hiddenY[j4], hiddenAct[j4], '');
    }
    for (var k2 = 0; k2 < OUTPUT_SIZE; k2++) {
      drawNode(xOutput, outputY[k2], outputAct[k2], 'ŷ');
    }

    ctx.fillStyle = '#aaaaaa';
    ctx.font = 'bold 11px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('输入层(' + inputSize + ')', xInput, padY - 4);
    ctx.fillText('隐藏层(' + HIDDEN_SIZE + ')', xHidden, padY - 4);
    ctx.fillText('输出层', xOutput, padY - 4);

    if (options.stage) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 11px "Courier New", Courier, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(options.stage, padX, h - padY + 4);
    }
    if (options.loss !== undefined) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 11px "Courier New", Courier, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('误差: ' + options.loss.toFixed(4), w - padX, h - padY + 4);
    }
  }

  // ============================================================
  // 渐进式训练 / Progressive Training
  //
  // 用前 k 个数字预测第 k+1 个：
  //   - 从 k = inputSize 开始，用 series[0..k-1] 预测 series[k]
  //   - 训练直到预测值与实际值误差 ≤ ±0.1，才进入下一组
  //   - 所有组训练完成后，用完整序列预测 steps 步
  // ============================================================
  function progressiveTrain(canvas, series, steps, onProgress) {
    return new Promise(function (resolve) {
      if (!series || series.length < MIN_INPUT_SIZE + 1) {
        resolve([]);
        return;
      }

      // 动态设置输入层大小 / set input size based on series length
      inputSize = Math.max(MIN_INPUT_SIZE, Math.min(MAX_INPUT_SIZE, series.length - 1));
      initWeights();

      var norm = normalizeSeries(series);
      var normData = norm.data;

      // 构建渐进训练任务 / build progressive training tasks
      // 每个任务：用 series[0..k-1] 的最后 inputSize 个值预测 series[k]
      var tasks = [];
      for (var k = inputSize; k < series.length; k++) {
        var input = [];
        for (var i = 0; i < inputSize; i++) {
          input.push(normData[k - inputSize + i]);
        }
        var target = [normData[k]];
        var actualVal = series[k];
        tasks.push({
          input: input,
          target: target,
          actualVal: actualVal,
          stepIdx: k - inputSize + 1
        });
      }

      var totalTasks = tasks.length;
      var currentTask = 0;
      var lr = LEARNING_RATE;
      var animFrame = 0;

      function trainStep() {
        if (currentTask >= totalTasks) {
          // 所有渐进任务完成，开始最终预测 / all progressive tasks done
          if (onProgress) onProgress(totalTasks, totalTasks, '神经网络预测中...');
          var preds = predict(series, steps);
          // 最终绘制 / final draw
          drawNetwork(canvas, {
            pulse: 0.8,
            inputActivations: new Array(inputSize).fill(0.6),
            hiddenActivations: new Array(HIDDEN_SIZE).fill(0.5),
            outputActivations: new Array(OUTPUT_SIZE).fill(0.7),
            stage: '训练完成',
            loss: 0
          });
          resolve(preds);
          return;
        }

        var task = tasks[currentTask];
        var maxEpochs = MAX_EPOCHS_PER_STEP;
        var epoch = 0;

        function frameWrapper() {
          // 每帧训练若干 epoch，用 rAF 调度避免阻塞 UI
          var epochsPerFrame = 10;
          for (var e = 0; e < epochsPerFrame && epoch < maxEpochs; e++) {
            trainSample(task.input, task.target, lr);
            epoch++;
          }

          // 计算当前预测值（反归一化）/ compute current prediction
          var out = forward(task.input);
          var predNorm = out.a2[0];
          var predDenorm = denormalize(predNorm, norm.mean, norm.std);
          var error = Math.abs(predDenorm - task.actualVal);

          // 绘制网络状态 / draw network
          var pulse = 0.5 + 0.5 * Math.sin(animFrame * 0.2);
          drawNetwork(canvas, {
            pulse: pulse,
            inputActivations: task.input.map(function (v) {
              return Math.min(1, Math.abs(v) * 0.5 + 0.3);
            }),
            hiddenActivations: out.a1.map(function (v) {
              return Math.min(1, Math.abs(v) * 0.5 + 0.2);
            }),
            outputActivations: out.a2.map(function (v) {
              return Math.min(1, Math.abs(v) * 0.5 + 0.3);
            }),
            stage: '步骤 ' + (currentTask + 1) + '/' + totalTasks +
                   ' (目标误差≤' + TOLERANCE + ')',
            loss: error
          });

          animFrame++;

          // 误差在 ±0.1 内 → 通过，进入下一组 / within tolerance → pass
          if (error <= TOLERANCE) {
            currentTask++;
            if (onProgress) {
              onProgress(currentTask, totalTasks,
                'NN步骤 ' + currentTask + '/' + totalTasks + ' 通过 (误差:' + error.toFixed(4) + ')');
            }
            setTimeout(trainStep, 100);
            return;
          }

          // 达到最大 epoch 仍未收敛，也进入下一组（避免卡死）
          if (epoch >= maxEpochs) {
            currentTask++;
            if (onProgress) {
              onProgress(currentTask, totalTasks,
                'NN步骤 ' + currentTask + '/' + totalTasks + ' 跳过 (误差:' + error.toFixed(4) + ')');
            }
            setTimeout(trainStep, 100);
            return;
          }

          requestAnimationFrame(frameWrapper);
        }

        requestAnimationFrame(frameWrapper);
      }

      if (onProgress) onProgress(0, totalTasks, '神经网络渐进训练开始...');
      trainStep();
    });
  }

  function reset() {
    inputSize = MIN_INPUT_SIZE;
    initWeights();
    lastPrediction = null;
  }

  function getInputSize() {
    return inputSize;
  }

  // ============================================================
  // 导出 / Exports
  // ============================================================
  initWeights();

  return {
    progressiveTrain: progressiveTrain,
    predict: predict,
    drawNetwork: drawNetwork,
    reset: reset,
    getInputSize: getInputSize,
    INPUT_SIZE: inputSize
  };
})();

// ============================================================
// 自检 / Self-test
// ============================================================
console.log('[nn] neural network module loaded');
