# Binance Asset Console

个人虚拟货币资产管理网站原型，优先实现资产仪表盘、配比调整、批量交易预案、订单状态和价格预警入口。

## 当前交付

- React/Vite 源码：`src/App.jsx`、`src/styles.css`
- 可直接打开的静态演示：`static-demo.html`
- 苹果风格高保真界面：浅色基底、强层级、8px 面板、微交互、响应式布局
- 低保真关键流程：仪表盘、配比调整、批量交易、订单管理
- 可视化：饼图、柱状图、折线图、动态点云图
- 交互：资产权重滑杆、风险预设、一键再平衡、批量交易表单、订单状态预览
- 多语言接口：React 版本内置中英文切换结构

## 运行

如果依赖已经可安装：

```bash
npm install
npm run dev
```

当前环境的外部安装审批超时，因此也提供了无需构建的预览：

```text
E:\MY\虚拟货币网站\static-demo.html
```

## Binance API 接入边界

前端只允许调用公开行情接口，例如 ticker、kline、mark price。账户余额、下单、撤单、修改订单、历史成交等私有接口必须通过后端签名服务完成。

建议后端职责：

- 保存 API Key 到服务器密钥库或 KMS，不写入浏览器、本地存储或前端包
- 使用 2FA 登录和敏感操作二次确认
- 按用户权限区分只读 Key 与交易 Key
- 服务端生成 Binance API 签名，前端只提交业务意图
- 对批量下单做风控校验：最大杠杆、单币种上限、止损必填、冷却时间
- 订单状态通过 WebSocket 或轮询同步到前端

## 建议后端接口

```text
GET  /api/portfolio/summary
GET  /api/market/tickers?symbols=BTCUSDT,ETHUSDT
POST /api/allocation/preview
POST /api/orders/batch
GET  /api/orders/open
PATCH /api/orders/:id
DELETE /api/orders/:id
POST /api/alerts
POST /api/auth/2fa/verify
```

## 安全提示

本原型中的交易模块默认是模拟执行，不会也不应直接从浏览器向币安私有交易接口下单。接入真实账户前，请先完成后端签名、审计日志、风控规则、2FA、密钥轮换和 HTTPS 部署。
