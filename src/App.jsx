import { useEffect, useMemo, useRef, useState } from 'react';

const translations = {
  zh: {
    dashboard: '资产仪表盘',
    allocation: '配比调整',
    trading: '批量交易',
    orders: '订单管理',
    alerts: '预警与安全',
    total: '总资产估值',
    pnl: '今日收益',
    risk: '风险偏好',
    quick: '快速配比',
    rebalance: '一键再平衡',
    batch: '批量下单',
    simulated: '模拟执行',
    market: '实时行情',
    suggestion: '智能建议',
  },
  en: {
    dashboard: 'Dashboard',
    allocation: 'Allocation',
    trading: 'Batch Trading',
    orders: 'Orders',
    alerts: 'Alerts & Security',
    total: 'Total Equity',
    pnl: 'Daily PnL',
    risk: 'Risk Profile',
    quick: 'Quick Mix',
    rebalance: 'Rebalance',
    batch: 'Batch Order',
    simulated: 'Simulated',
    market: 'Live Market',
    suggestion: 'Smart Insight',
  },
};

const starterAssets = [
  { symbol: 'BTC', pair: 'BTCUSDT', color: '#111111', amount: 0.72, target: 38, avgCost: 65400 },
  { symbol: 'ETH', pair: 'ETHUSDT', color: '#2f6bff', amount: 7.8, target: 28, avgCost: 3360 },
  { symbol: 'BNB', pair: 'BNBUSDT', color: '#f0b90b', amount: 41, target: 13, avgCost: 610 },
  { symbol: 'SOL', pair: 'SOLUSDT', color: '#12c2a3', amount: 120, target: 11, avgCost: 142 },
  { symbol: 'XRP', pair: 'XRPUSDT', color: '#7b61ff', amount: 9200, target: 6, avgCost: 0.58 },
  { symbol: 'ADA', pair: 'ADAUSDT', color: '#ff5c7a', amount: 14500, target: 4, avgCost: 0.43 },
];

const fallbackPrices = {
  BTCUSDT: { price: 104250, change: 1.9 },
  ETHUSDT: { price: 3575, change: -0.6 },
  BNBUSDT: { price: 692, change: 0.8 },
  SOLUSDT: { price: 168, change: 3.4 },
  XRPUSDT: { price: 0.64, change: -1.1 },
  ADAUSDT: { price: 0.49, change: 2.1 },
};

const trendSeed = [0.99, 1.01, 1.004, 1.025, 1.018, 1.038, 1.029, 1.047, 1.041, 1.061, 1.056, 1.073];

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function number(value, digits = 2) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}

function useMarketData() {
  const [prices, setPrices] = useState(fallbackPrices);
  const [source, setSource] = useState('demo');

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const symbols = starterAssets.map((asset) => `"${asset.pair}"`).join(',');
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbols}]`);
        if (!res.ok) throw new Error('market unavailable');
        const data = await res.json();
        if (!alive) return;
        const next = {};
        for (const row of data) {
          next[row.symbol] = {
            price: Number(row.lastPrice),
            change: Number(row.priceChangePercent),
          };
        }
        setPrices((current) => ({ ...current, ...next }));
        setSource('binance-public');
      } catch {
        setSource('demo');
      }
    }
    load();
    const id = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return { prices, source };
}

function PieChart({ rows }) {
  let start = 0;
  const slices = rows.map((row) => {
    const angle = (row.weight / 100) * 360;
    const end = start + angle;
    const large = angle > 180 ? 1 : 0;
    const a = (Math.PI / 180) * (start - 90);
    const b = (Math.PI / 180) * (end - 90);
    const x1 = 50 + 40 * Math.cos(a);
    const y1 = 50 + 40 * Math.sin(a);
    const x2 = 50 + 40 * Math.cos(b);
    const y2 = 50 + 40 * Math.sin(b);
    start = end;
    return `M 50 50 L ${x1} ${y1} A 40 40 0 ${large} 1 ${x2} ${y2} Z`;
  });

  return (
    <svg className="pie" viewBox="0 0 100 100" role="img" aria-label="Asset allocation pie chart">
      {slices.map((path, index) => (
        <path key={rows[index].symbol} d={path} fill={rows[index].color} />
      ))}
      <circle cx="50" cy="50" r="24" fill="var(--panel)" />
    </svg>
  );
}

function Bars({ rows }) {
  const max = Math.max(...rows.map((row) => row.value));
  return (
    <div className="bars">
      {rows.map((row) => (
        <div className="barItem" key={row.symbol}>
          <span>{row.symbol}</span>
          <div className="barTrack">
            <div className="barFill" style={{ width: `${(row.value / max) * 100}%`, background: row.color }} />
          </div>
          <strong>{money(row.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function LineChart({ total }) {
  const points = trendSeed.map((factor, index) => [index * 9, 70 - ((total * factor) / total - 0.98) * 900]);
  const d = points.map((point, index) => `${index ? 'L' : 'M'} ${point[0]} ${point[1]}`).join(' ');
  return (
    <svg className="lineChart" viewBox="0 0 100 80" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGlow" x1="0" x2="1">
          <stop stopColor="#2f6bff" />
          <stop offset="1" stopColor="#12c2a3" />
        </linearGradient>
      </defs>
      <path d={`${d} L 99 80 L 0 80 Z`} fill="url(#lineGlow)" opacity="0.12" />
      <path d={d} fill="none" stroke="url(#lineGlow)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function PointCloud({ rows }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const DPR = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * DPR;
    canvas.height = rect.height * DPR;
    ctx.scale(DPR, DPR);
    let frame = 0;
    let raf;
    const points = rows.flatMap((row, assetIndex) =>
      Array.from({ length: 18 }, (_, index) => ({
        assetIndex,
        index,
        radius: 22 + row.weight * 1.15 + (index % 5) * 7,
        speed: 0.006 + assetIndex * 0.0015,
        color: row.color,
      })),
    );
    function draw() {
      frame += 1;
      ctx.clearRect(0, 0, rect.width, rect.height);
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      for (const p of points) {
        const angle = frame * p.speed + p.index * 0.73 + p.assetIndex;
        const x = cx + Math.cos(angle) * p.radius + Math.sin(frame * 0.01 + p.index) * 8;
        const y = cy + Math.sin(angle * 1.23) * p.radius * 0.58;
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.28;
        ctx.arc(x, y, 2.4 + (p.index % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, [rows]);

  return <canvas className="pointCloud" ref={canvasRef} aria-label="Animated asset point cloud" />;
}

function Wireframes({ t }) {
  return (
    <section className="wireframes" id="flow">
      {[
        [t.dashboard, '总览卡片 / 持仓饼图 / 收益折线 / 快捷入口'],
        [t.allocation, '目标权重滑杆 / 拖拽排序 / 一键再平衡预览'],
        [t.trading, '多币种选择 / 做多做空 / 杠杆 / 止盈止损'],
        [t.orders, '委托追踪 / 历史记录 / 撤销修改'],
      ].map(([title, text]) => (
        <article className="wireCard" key={title}>
          <div className="wireTop" />
          <div className="wireBody">
            <div />
            <div />
            <div />
          </div>
          <h3>{title}</h3>
          <p>{text}</p>
        </article>
      ))}
    </section>
  );
}

function App() {
  const [lang, setLang] = useState('zh');
  const [risk, setRisk] = useState('balanced');
  const [assets, setAssets] = useState(starterAssets);
  const [selected, setSelected] = useState(['BTC', 'ETH', 'SOL']);
  const [side, setSide] = useState('LONG');
  const [leverage, setLeverage] = useState(3);
  const [alertPrice, setAlertPrice] = useState('110000');
  const { prices, source } = useMarketData();
  const t = translations[lang];

  const rows = useMemo(() => {
    const values = assets.map((asset) => ({
      ...asset,
      price: prices[asset.pair]?.price || fallbackPrices[asset.pair].price,
      change: prices[asset.pair]?.change || fallbackPrices[asset.pair].change,
    })).map((asset) => ({
      ...asset,
      value: asset.amount * asset.price,
      pnl: (asset.price - asset.avgCost) * asset.amount,
    }));
    const total = values.reduce((sum, asset) => sum + asset.value, 0);
    return values.map((asset) => ({ ...asset, weight: (asset.value / total) * 100 }));
  }, [assets, prices]);

  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const pnl = rows.reduce((sum, row) => sum + row.pnl, 0);
  const targetTotal = assets.reduce((sum, asset) => sum + asset.target, 0) || 1;
  const targetRows = assets.map((asset) => ({ ...asset, target: (asset.target / targetTotal) * 100 }));
  const orders = selected.map((symbol, index) => ({
    id: `SIM-${Math.floor(total).toString(16).toUpperCase()}-${index + 1}`,
    symbol,
    side,
    leverage,
    size: money((total * (assets.find((asset) => asset.symbol === symbol)?.target || 5)) / 100),
    status: index === 0 ? '追踪中' : '待确认',
  }));

  function setTarget(symbol, target) {
    setAssets((current) => current.map((asset) => (asset.symbol === symbol ? { ...asset, target } : asset)));
  }

  function applyPreset(type) {
    const presets = {
      conservative: { BTC: 48, ETH: 26, BNB: 12, SOL: 6, XRP: 5, ADA: 3 },
      balanced: { BTC: 38, ETH: 28, BNB: 13, SOL: 11, XRP: 6, ADA: 4 },
      growth: { BTC: 28, ETH: 25, BNB: 10, SOL: 22, XRP: 8, ADA: 7 },
    };
    setRisk(type);
    setAssets((current) => current.map((asset) => ({ ...asset, target: presets[type][asset.symbol] })));
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <span className="brandDot" />
          <strong>Binance Asset Console</strong>
        </div>
        <nav>
          <a href="#dashboard">{t.dashboard}</a>
          <a href="#trade">{t.trading}</a>
          <a href="#flow">Prototype</a>
        </nav>
        <div className="topActions">
          <span className={`source ${source === 'demo' ? 'demo' : ''}`}>{source}</span>
          <button className="iconButton" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} aria-label="Toggle language">
            {lang === 'zh' ? 'EN' : '中'}
          </button>
        </div>
      </header>

      <section className="hero" id="dashboard">
        <div className="heroCopy">
          <p className="eyebrow">BINANCE API READY / 2FA FIRST</p>
          <h1>个人虚拟货币资产管理工作台</h1>
          <p>用一屏完成资产洞察、目标配比、批量交易预案与风险提醒。真实账户交易通过后端签名服务接入，当前界面默认模拟执行。</p>
          <div className="heroActions">
            <a className="primary" href="#allocation">{t.quick}</a>
            <a className="secondary" href="#trade">{t.batch}</a>
          </div>
        </div>
        <div className="heroVisual">
          <PointCloud rows={rows} />
          <div className="floatingMetric">
            <span>{t.total}</span>
            <strong>{money(total)}</strong>
          </div>
        </div>
      </section>

      <section className="metrics">
        <article>
          <span>{t.total}</span>
          <strong>{money(total)}</strong>
          <small>Spot + Futures margin preview</small>
        </article>
        <article>
          <span>{t.pnl}</span>
          <strong className={pnl >= 0 ? 'up' : 'down'}>{pnl >= 0 ? '+' : ''}{money(pnl)}</strong>
          <small>基于平均成本估算</small>
        </article>
        <article>
          <span>{t.risk}</span>
          <strong>{risk}</strong>
          <small>影响智能配比建议</small>
        </article>
        <article>
          <span>2FA / API Key</span>
          <strong>Vault Ready</strong>
          <small>仅后端保存密钥</small>
        </article>
      </section>

      <section className="dashboardGrid">
        <article className="panel allocationPanel">
          <div className="panelTitle">
            <div>
              <span>{t.dashboard}</span>
              <h2>持仓比例</h2>
            </div>
            <button onClick={() => applyPreset('balanced')}>{t.rebalance}</button>
          </div>
          <div className="allocationVisual">
            <PieChart rows={rows} />
            <div className="legend">
              {rows.map((row) => (
                <div key={row.symbol}>
                  <span style={{ background: row.color }} />
                  <strong>{row.symbol}</strong>
                  <em>{number(row.weight)}%</em>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panelTitle">
            <div>
              <span>{t.market}</span>
              <h2>价值分布</h2>
            </div>
          </div>
          <Bars rows={rows} />
        </article>

        <article className="panel wide">
          <div className="panelTitle">
            <div>
              <span>PNL TREND</span>
              <h2>收益波动</h2>
            </div>
            <strong className="up">+7.3%</strong>
          </div>
          <LineChart total={total} />
        </article>
      </section>

      <section className="workbench">
        <article className="panel" id="allocation">
          <div className="panelTitle">
            <div>
              <span>{t.allocation}</span>
              <h2>拖拽式权重预案</h2>
            </div>
            <div className="segmented">
              {['conservative', 'balanced', 'growth'].map((item) => (
                <button className={risk === item ? 'active' : ''} onClick={() => applyPreset(item)} key={item}>{item}</button>
              ))}
            </div>
          </div>
          <div className="sliders">
            {targetRows.map((asset) => (
              <label key={asset.symbol}>
                <span><b>{asset.symbol}</b><em>{number(asset.target)}%</em></span>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={asset.target}
                  onChange={(event) => setTarget(asset.symbol, Number(event.target.value))}
                  style={{ accentColor: asset.color }}
                />
              </label>
            ))}
          </div>
        </article>

        <article className="panel tradePanel" id="trade">
          <div className="panelTitle">
            <div>
              <span>{t.trading}</span>
              <h2>多币种杠杆交易</h2>
            </div>
            <span className="pill">{t.simulated}</span>
          </div>
          <div className="coinGrid">
            {assets.map((asset) => (
              <button
                className={selected.includes(asset.symbol) ? 'selected' : ''}
                onClick={() => setSelected((current) => current.includes(asset.symbol) ? current.filter((item) => item !== asset.symbol) : [...current, asset.symbol])}
                key={asset.symbol}
              >
                <span style={{ background: asset.color }} />
                {asset.symbol}
              </button>
            ))}
          </div>
          <div className="formGrid">
            <label>
              方向
              <select value={side} onChange={(event) => setSide(event.target.value)}>
                <option>LONG</option>
                <option>SHORT</option>
              </select>
            </label>
            <label>
              杠杆
              <input type="number" min="1" max="20" value={leverage} onChange={(event) => setLeverage(Number(event.target.value))} />
            </label>
            <label>
              止盈
              <input defaultValue="8%" />
            </label>
            <label>
              止损
              <input defaultValue="3%" />
            </label>
          </div>
          <button className="primary full">{t.batch}</button>
        </article>
      </section>

      <section className="orders">
        <article className="panel">
          <div className="panelTitle">
            <div>
              <span>{t.orders}</span>
              <h2>实时委托状态</h2>
            </div>
            <button>一键撤销</button>
          </div>
          <div className="table">
            {orders.map((order) => (
              <div className="tr" key={order.id}>
                <span>{order.id}</span>
                <strong>{order.symbol} {order.side}</strong>
                <span>{order.leverage}x</span>
                <span>{order.size}</span>
                <em>{order.status}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panelTitle">
            <div>
              <span>{t.suggestion}</span>
              <h2>策略与预警</h2>
            </div>
          </div>
          <div className="insight">
            <p>当前组合 BTC/ETH 权重稳定，SOL 波动贡献较高。若风险偏好为 balanced，建议将 SOL 目标权重控制在 12% 内，并为 BTC 设置突破提醒。</p>
            <label>
              BTC 价格阈值
              <input value={alertPrice} onChange={(event) => setAlertPrice(event.target.value)} />
            </label>
            <div className="securityList">
              <span>2FA 登录</span>
              <span>API 密钥托管</span>
              <span>TLS 传输</span>
              <span>只读/交易权限分离</span>
            </div>
          </div>
        </article>
      </section>

      <Wireframes t={t} />
    </main>
  );
}

export default App;
