/**
 * expression-parser.js
 * 安全的数学表达式解析器
 *
 * 安全特性：
 *   - Token 级解析 + AST 评估，不使用 eval 或 new Function
 *   - 严格字符白名单
 *   - 递归深度限制（最大 100 层）
 *   - 纯函数求值，不访问外部对象
 *
 * 支持：
 *   - 数字（整数、小数、科学计数法）
 *   - 变量 x
 *   - 运算符：+ - * / ^ ( )
 *   - 函数：sin, cos, tan, asin, acos, atan, sqrt, abs, log, ln, exp, floor, ceil, round
 *   - 常量：pi, e
 *   - 运算符优先级：^ > * / > + -
 *   - ^ 运算符右结合
 */
(function () {
  'use strict';

  const MAX_RECURSION_DEPTH = 100;

  const VALID_CHARS = /^[0-9a-zA-Z+\-*/^().\s]+$/;

  const FUNCTIONS = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    sqrt: Math.sqrt,
    abs: Math.abs,
    log: Math.log10,
    ln: Math.log,
    exp: Math.exp,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round
  };

  const CONSTANTS = {
    pi: Math.PI,
    e: Math.E
  };

  const PARAM_CHARS = 'abcdefghkmnpqrstuvwz';

  const TokenType = {
    NUMBER: 'NUMBER',
    VARIABLE: 'VARIABLE',
    PARAM: 'PARAM',
    OPERATOR: 'OPERATOR',
    FUNCTION: 'FUNCTION',
    CONSTANT: 'CONSTANT',
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    EOF: 'EOF'
  };

  function tokenize(expr) {
    if (typeof expr !== 'string') {
      throw new Error('表达式必须是字符串');
    }
    if (!VALID_CHARS.test(expr)) {
      throw new Error('包含非法字符');
    }

    const tokens = [];
    let i = 0;
    const len = expr.length;

    while (i < len) {
      const ch = expr.charAt(i);

      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        i++;
        continue;
      }

      if ((ch >= '0' && ch <= '9') || (ch === '.' && i + 1 < len && expr.charAt(i + 1) >= '0' && expr.charAt(i + 1) <= '9')) {
        let numStr = '';
        let hasDot = false;
        let hasExp = false;

        while (i < len) {
          const c = expr.charAt(i);
          if (c >= '0' && c <= '9') {
            numStr += c;
            i++;
          } else if (c === '.' && !hasDot && !hasExp) {
            hasDot = true;
            numStr += c;
            i++;
          } else if ((c === 'e' || c === 'E') && !hasExp) {
            hasExp = true;
            numStr += c;
            i++;
            if (i < len && (expr.charAt(i) === '+' || expr.charAt(i) === '-')) {
              numStr += expr.charAt(i);
              i++;
            }
          } else {
            break;
          }
        }

        const num = parseFloat(numStr);
        if (isNaN(num) || !isFinite(num)) {
          throw new Error('无效数字: ' + numStr);
        }
        tokens.push({ type: TokenType.NUMBER, value: num });
        continue;
      }

      if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
        let ident = '';
        while (i < len) {
          const c = expr.charAt(i);
          if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')) {
            ident += c;
            i++;
          } else {
            break;
          }
        }

        const identLower = ident.toLowerCase();

        if (FUNCTIONS.hasOwnProperty(identLower)) {
          tokens.push({ type: TokenType.FUNCTION, value: identLower });
        } else if (CONSTANTS.hasOwnProperty(identLower)) {
          tokens.push({ type: TokenType.CONSTANT, value: identLower });
        } else if (identLower === 'x') {
          tokens.push({ type: TokenType.VARIABLE, value: 'x' });
        } else if (identLower.length === 1 && PARAM_CHARS.indexOf(identLower) >= 0) {
          tokens.push({ type: TokenType.PARAM, value: identLower });
        } else {
          throw new Error('未知标识符: ' + ident);
        }
        continue;
      }

      if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
        tokens.push({ type: TokenType.OPERATOR, value: ch });
        i++;
        continue;
      }

      if (ch === '(') {
        tokens.push({ type: TokenType.LPAREN, value: ch });
        i++;
        continue;
      }

      if (ch === ')') {
        tokens.push({ type: TokenType.RPAREN, value: ch });
        i++;
        continue;
      }

      throw new Error('无法识别的字符: ' + ch);
    }

    tokens.push({ type: TokenType.EOF, value: null });
    return tokens;
  }

  function createParser(tokens) {
    let pos = 0;
    let depth = 0;

    function peek() {
      return tokens[pos];
    }

    function consume() {
      return tokens[pos++];
    }

    function expect(type, errorMsg) {
      const tok = peek();
      if (tok.type !== type) {
        throw new Error(errorMsg || ('期望 ' + type + '，得到 ' + tok.type));
      }
      return consume();
    }

    function checkDepth() {
      if (depth > MAX_RECURSION_DEPTH) {
        throw new Error('表达式嵌套过深');
      }
    }

    function parseExpression() {
      checkDepth();
      depth++;
      const result = parseAddSub();
      depth--;
      return result;
    }

    function parseAddSub() {
      checkDepth();
      depth++;
      let left = parseMulDiv();

      while (peek().type === TokenType.OPERATOR &&
             (peek().value === '+' || peek().value === '-')) {
        const op = consume();
        const right = parseMulDiv();
        left = { type: 'BinaryOp', op: op.value, left: left, right: right };
      }

      depth--;
      return left;
    }

    function parseMulDiv() {
      checkDepth();
      depth++;
      let left = parseUnary();

      while (peek().type === TokenType.OPERATOR &&
             (peek().value === '*' || peek().value === '/')) {
        const op = consume();
        const right = parseUnary();
        left = { type: 'BinaryOp', op: op.value, left: left, right: right };
      }

      depth--;
      return left;
    }

    function parseUnary() {
      checkDepth();
      depth++;
      const tok = peek();

      if (tok.type === TokenType.OPERATOR && (tok.value === '+' || tok.value === '-')) {
        const op = consume();
        const operand = parseUnary();
        depth--;
        return { type: 'UnaryOp', op: op.value, operand: operand };
      }

      const result = parsePower();
      depth--;
      return result;
    }

    function parsePower() {
      checkDepth();
      depth++;
      const base = parsePrimary();

      if (peek().type === TokenType.OPERATOR && peek().value === '^') {
        consume();
        const exponent = parseUnary();
        depth--;
        return { type: 'BinaryOp', op: '^', left: base, right: exponent };
      }

      depth--;
      return base;
    }

    function parsePrimary() {
      checkDepth();
      depth++;
      const tok = peek();

      if (tok.type === TokenType.NUMBER) {
        consume();
        depth--;
        return { type: 'Number', value: tok.value };
      }

      if (tok.type === TokenType.VARIABLE) {
        consume();
        depth--;
        return { type: 'Variable', name: tok.value };
      }

      if (tok.type === TokenType.PARAM) {
        consume();
        depth--;
        return { type: 'Param', name: tok.value };
      }

      if (tok.type === TokenType.CONSTANT) {
        consume();
        depth--;
        return { type: 'Constant', name: tok.value };
      }

      if (tok.type === TokenType.FUNCTION) {
        const funcName = tok.value;
        consume();
        expect(TokenType.LPAREN, '函数调用后必须有左括号');
        const arg = parseExpression();
        expect(TokenType.RPAREN, '函数调用后必须有右括号');
        depth--;
        return { type: 'FunctionCall', name: funcName, argument: arg };
      }

      if (tok.type === TokenType.LPAREN) {
        consume();
        const expr = parseExpression();
        expect(TokenType.RPAREN, '缺少右括号');
        depth--;
        return expr;
      }

      throw new Error('意外的 token: ' + (tok.value || tok.type));
    }

    return {
      parse: function () {
        const ast = parseExpression();
        if (peek().type !== TokenType.EOF) {
          throw new Error('表达式有多余内容');
        }
        return ast;
      }
    };
  }

  function evalAst(node, x, params) {
    if (node === null || node === undefined) {
      throw new Error('无效的 AST 节点');
    }
    if (params === undefined || params === null) params = {};

    switch (node.type) {
      case 'Number':
        return node.value;

      case 'Variable':
        if (node.name === 'x') {
          if (typeof x !== 'number') {
            throw new Error('变量 x 未定义');
          }
          return x;
        }
        throw new Error('未知变量: ' + node.name);

      case 'Param':
        if (params.hasOwnProperty(node.name)) {
          const val = params[node.name];
          if (typeof val !== 'number') {
            throw new Error('参数 ' + node.name + ' 不是数字');
          }
          return val;
        }
        throw new Error('未定义参数: ' + node.name);

      case 'Constant':
        if (CONSTANTS.hasOwnProperty(node.name)) {
          return CONSTANTS[node.name];
        }
        throw new Error('未知常量: ' + node.name);

      case 'UnaryOp': {
        const val = evalAst(node.operand, x, params);
        if (node.op === '-') return -val;
        if (node.op === '+') return val;
        throw new Error('未知一元运算符: ' + node.op);
      }

      case 'BinaryOp': {
        const left = evalAst(node.left, x, params);
        const right = evalAst(node.right, x, params);
        switch (node.op) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/':
            if (right === 0) throw new Error('除数不能为零');
            return left / right;
          case '^':
            return Math.pow(left, right);
          default:
            throw new Error('未知二元运算符: ' + node.op);
        }
      }

      case 'FunctionCall': {
        const arg = evalAst(node.argument, x, params);
        const fn = FUNCTIONS[node.name];
        if (!fn) {
          throw new Error('未知函数: ' + node.name);
        }
        return fn(arg);
      }

      default:
        throw new Error('未知 AST 节点类型: ' + node.type);
    }
  }

  function parseExpressionSafe(expr) {
    try {
      const tokens = tokenize(expr);
      const parser = createParser(tokens);
      const ast = parser.parse();
      return { ok: true, ast: ast, error: null };
    } catch (e) {
      return { ok: false, ast: null, error: e.message || '解析错误' };
    }
  }

  function createEvaluator(ast) {
    return function (x, params) {
      return evalAst(ast, x, params);
    };
  }

  function extractParams(ast) {
    const params = {};
    function walk(node) {
      if (!node) return;
      if (node.type === 'Param') {
        params[node.name] = true;
        return;
      }
      if (node.type === 'UnaryOp') {
        walk(node.operand);
      } else if (node.type === 'BinaryOp') {
        walk(node.left);
        walk(node.right);
      } else if (node.type === 'FunctionCall') {
        walk(node.argument);
      }
    }
    walk(ast);
    return Object.keys(params).sort();
  }

  window.ExpressionParser = {
    tokenize: tokenize,
    parse: parseExpressionSafe,
    evalAst: evalAst,
    createEvaluator: createEvaluator,
    extractParams: extractParams,
    FUNCTIONS: FUNCTIONS,
    CONSTANTS: CONSTANTS,
    PARAM_CHARS: PARAM_CHARS,
    TokenType: TokenType,
    MAX_RECURSION_DEPTH: MAX_RECURSION_DEPTH
  };
})();
