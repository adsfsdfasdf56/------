import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const ASSETS = [
  { symbol: 'BTC', pair: 'BTCUSDT', color: '#111111', amount: 0.72, target: 38, avgCost: 65400 },
  { symbol: 'ETH', pair: 'ETHUSDT', color: '#2f6bff', amount: 7.8, target: 28, avgCost: 3360 },
  { symbol: 'BNB', pair: 'BNBUSDT', color: '#f0b90b', amount: 41, target: 13, avgCost: 610 },
  { symbol: 'SOL', pair: 'SOLUSDT', color: '#12c2a3', amount: 120, target: 11, avgCost: 142 },
  { symbol: 'XRP', pair: 'XRPUSDT', color: '#7b61ff', amount: 9200, target: 6, avgCost: 0.58 },
  { symbol: 'ADA', pair: 'ADAUSDT', color: '#ff5c7a', amount: 14500, target: 4, avgCost: 0.43 },
];

const FALLBACK_PRICES = {
  BTCUSDT: { price: 104250, change: 1.9 },
  ETHUSDT: { price: 3575, change: -0.6 },
  BNBUSDT: { price: 692, change: 0.8 },
  SOLUSDT: { price: 168, change: 3.4 },
  XRPUSDT: { price: 0.64, change: -1.1 },
  ADAUSDT: { price: 0.49, change: 2.1 },
};

const TEXT = {
  zh: {
    navPrices: '实时价格',
    navAllocation: '目标配比',
    navTrade: '模拟交易',
    headline: '先看价格，再调配比，最后确认交易',
    subtitle: '基于 Binance 公共行情刷新价格。账户余额、私有订单和真实下单必须通过后端签名服务接入，当前界面只做模拟预览。',
    total: '总资产估值',
    pnl: '浮动收益',
    dataSource: '数据源',
    refreshed: '刷新时间',
    refresh: '手动刷新',
    demo: '示例数据',
    binance: 'Binance 公共行情',
    priceBoard: '实时价格看板',
    priceBoardDesc: '最新价、24h 涨跌和持仓价值集中展示。',
    allocation: '目标配比',
    allocationDesc: '每个币种卡片直接调整目标权重，差额即时反馈。',
    distribution: '资产分布',
    trend: '收益趋势',
    quickActions: '快捷动作',
    rebalance: '恢复均衡配置',
    selectCore: '选择核心币',
    generate: '生成模拟订单',
    trade: '模拟批量交易',
    step1: '1. 选择币种',
    step2: '2. 设置参数',
    step3: '3. 预览订单',
    direction: '方向',
    leverage: '杠杆',
    takeProfit: '止盈',
    stopLoss: '止损',
    alert: '价格预警',
    orderPreview: '订单预览',
    simulated: '模拟执行',
    currentWeight: '当前',
    targetWeight: '目标',
    gap: '差额',
    value: '持仓价值',
    amount: '持仓数量',
    note: '安全说明',
    noteBody: '真实交易需要后端 API 签名、2FA、风控校验和密钥托管。浏览器端不保存 API Key。',
  },
  en: {
    navPrices: 'Live Prices',
    navAllocation: 'Allocation',
    navTrade: 'Sim Trade',
    headline: 'Check prices, tune allocation, confirm trades',
    subtitle: 'Prices refresh from Binance public market data. Balances, private orders, and real execution must go through a signed backend service. This UI only previews simulated orders.',
    total: 'Total Equity',
    pnl: 'Unrealized PnL',
    dataSource: 'Data Source',
    refreshed: 'Updated',
    refresh: 'Refresh',
    demo: 'Demo Data',
    binance: 'Binance Public',
    priceBoard: 'Live Price Board',
    priceBoardDesc: 'Latest price, 24h move, and holding value in one place.',
    allocation: 'Target Allocation',
    allocationDesc: 'Adjust every target weight directly and see the gap instantly.',
    distribution: 'Distribution',
    trend: 'PnL Trend',
    quickActions: 'Quick Actions',
    rebalance: 'Reset Balanced Mix',
    selectCore: 'Select Core Coins',
    generate: 'Generate Sim Orders',
    trade: 'Sim Batch Trading',
    step1: '1. Select Coins',
    step2: '2. Set Params',
    step3: '3. Preview Orders',
    direction: 'Direction',
    leverage: 'Leverage',
    takeProfit: 'Take Profit',
    stopLoss: 'Stop Loss',
    alert: 'Price Alert',
    orderPreview: 'Order Preview',
    simulated: 'Simulated',
    currentWeight: 'Current',
    targetWeight: 'Target',
    gap: 'Gap',
    value: 'Value',
    amount: 'Amount',
    note: 'Security Note',
    noteBody: 'Real trading requires backend API signing, 2FA, risk checks, and key vaulting. API keys must not be stored in the browser.',
  },
};

const PRESETS = {
  balanced: { BTC: 38, ETH: 28, BNB: 13, SOL: 11, XRP: 6, ADA: 4 },
  core: { BTC: 50, ETH: 30, BNB: 10, SOL: 5, XRP: 3, ADA: 2 },
};

function money(value, digits = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
  }).format(value);
}

function numeric(value, digits = 2) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}

function timeLabel(date, lang) {
  if (!date) return lang === 'zh' ? '未刷新' : 'Not refreshed';
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function useMarketData() {
  const [prices, setPrices] = useState(FALLBACK_PRICES);
  const [source, setSource] = useState('demo');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const symbols = encodeURIComponent(JSON.stringify(ASSETS.map((asset) => asset.pair)));
      const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbols}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const next = {};
      for (const item of data) {
        next[item.symbol] = {
          price: Number(item.lastPrice),
          change: Number(item.priceChangePercent),
        };
      }
      setPrices((current) => ({ ...current, ...next }));
      setSource('binance-public');
      setUpdatedAt(new Date());
      setError('');
    } catch (err) {
      setSource('demo');
      setUpdatedAt(new Date());
      setError(err instanceof Error ? err.message : 'market unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 8000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return { prices, source, updatedAt, loading, error, refresh };
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
    <svg className="pie" viewBox="0 0 100 100" role="img" aria-label="Asset allocation chart">
      {slices.map((path, index) => (
        <path key={rows[index].symbol} d={path} fill={rows[index].color} />
      ))}
      <circle cx="50" cy="50" r="24" fill="var(--panel)" />
    </svg>
  );
}

function Sparkline({ rows }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const seed = [0.986, 1.004, 0.998, 1.017, 1.012, 1.031, 1.026, 1.043, 1.038, 1.057, 1.052, 1.068];
  const points = seed.map((factor, index) => [index * 9, 70 - ((total * factor) / total - 0.98) * 860]);
  const d = points.map((point, index) => `${index ? 'L' : 'M'} ${point[0]} ${point[1]}`).join(' ');

  return (
    <svg className="lineChart" viewBox="0 0 100 80" preserveAspectRatio="none">
      <defs>
        <linearGradient id="trendGlow" x1="0" x2="1">
          <stop stopColor="#0071e3" />
          <stop offset="1" stopColor="#12c2a3" />
        </linearGradient>
      </defs>
      <path d={`${d} L 99 80 L 0 80 Z`} fill="url(#trendGlow)" opacity="0.12" />
      <path d={d} fill="none" stroke="url(#trendGlow)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function PointCloud({ rows }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let raf = 0;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const points = rows.flatMap((row, assetIndex) =>
      Array.from({ length: 16 }, (_, index) => ({
        assetIndex,
        index,
        radius: 24 + row.weight * 1.05 + (index % 4) * 8,
        speed: 0.006 + assetIndex * 0.0014,
        color: row.color,
      })),
    );

    function draw() {
      const rect = canvas.getBoundingClientRect();
      frame += 1;
      ctx.clearRect(0, 0, rect.width, rect.height);
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      for (const point of points) {
        const angle = frame * point.speed + point.index * 0.78 + point.assetIndex;
        const x = cx + Math.cos(angle) * point.radius + Math.sin(frame * 0.011 + point.index) * 8;
        const y = cy + Math.sin(angle * 1.18) * point.radius * 0.58;
        ctx.beginPath();
        ctx.fillStyle = point.color;
        ctx.globalAlpha = 0.28;
        ctx.arc(x, y, 2.3 + (point.index % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = window.requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [rows]);

  return <canvas className="pointCloud" ref={canvasRef} aria-label="Animated asset point cloud" />;
}

function App() {
  const [lang, setLang] = useState('zh');
  const [assets, setAssets] = useState(ASSETS);
  const [selected, setSelected] = useState(['BTC', 'ETH', 'SOL']);
  const [side, setSide] = useState('LONG');
  const [leverage, setLeverage] = useState(3);
  const [takeProfit, setTakeProfit] = useState('8');
  const [stopLoss, setStopLoss] = useState('3');
  const [alertPrice, setAlertPrice] = useState('110000');
  const market = useMarketData();
  const t = TEXT[lang];

  const rows = useMemo(() => {
    const values = assets.map((asset) => {
      const marketPrice = market.prices[asset.pair] || FALLBACK_PRICES[asset.pair];
      const price = marketPrice.price;
      return {
        ...asset,
        price,
        change: marketPrice.change,
        value: asset.amount * price,
        pnl: (price - asset.avgCost) * asset.amount,
      };
    });
    const total = values.reduce((sum, asset) => sum + asset.value, 0);
    return values.map((asset) => ({ ...asset, weight: total ? (asset.value / total) * 100 : 0 }));
  }, [assets, market.prices]);

  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const pnl = rows.reduce((sum, row) => sum + row.pnl, 0);
  const normalizedTargetTotal = assets.reduce((sum, asset) => sum + asset.target, 0) || 1;

  function setTarget(symbol, target) {
    setAssets((current) => current.map((asset) => (asset.symbol === symbol ? { ...asset, target } : asset)));
  }

  function applyPreset(preset) {
    setAssets((current) => current.map((asset) => ({ ...asset, target: PRESETS[preset][asset.symbol] })));
  }

  function toggleCoin(symbol) {
    setSelected((current) => (current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol]));
  }

  const orderPreview = selected.map((symbol, index) => {
    const asset = rows.find((row) => row.symbol === symbol);
    const target = assets.find((item) => item.symbol === symbol)?.target || 0;
    return {
      id: `SIM-${index + 1}`,
      symbol,
      side,
      leverage,
      notional: total * (target / normalizedTargetTotal),
      price: asset?.price || 0,
    };
  });

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <span className="brandDot" />
          <strong>Binance Asset Console</strong>
        </div>
        <nav>
          <a href="#prices">{t.navPrices}</a>
          <a href="#allocation">{t.navAllocation}</a>
          <a href="#trade">{t.navTrade}</a>
        </nav>
        <div className="topActions">
          <span className={`source ${market.source === 'demo' ? 'demo' : ''}`}>
            {market.source === 'demo' ? t.demo : t.binance}
          </span>
          <button className="iconButton" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} aria-label="Toggle language">
            {lang === 'zh' ? 'EN' : '中'}
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">PUBLIC MARKET DATA / SIMULATED EXECUTION</p>
          <h1>{t.headline}</h1>
          <p>{t.subtitle}</p>
          <div className="heroActions">
            <a className="primary" href="#prices">{t.navPrices}</a>
            <a className="secondary" href="#trade">{t.generate}</a>
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
          <small>BTC / ETH / BNB / SOL / XRP / ADA</small>
        </article>
        <article>
          <span>{t.pnl}</span>
          <strong className={pnl >= 0 ? 'up' : 'down'}>{pnl >= 0 ? '+' : ''}{money(pnl)}</strong>
          <small>{t.value}</small>
        </article>
        <article>
          <span>{t.dataSource}</span>
          <strong>{market.source === 'demo' ? t.demo : t.binance}</strong>
          <small>{market.error || 'REST ticker / 8s'}</small>
        </article>
        <article>
          <span>{t.refreshed}</span>
          <strong>{timeLabel(market.updatedAt, lang)}</strong>
          <button className="miniButton" onClick={market.refresh} disabled={market.loading}>
            {market.loading ? '...' : t.refresh}
          </button>
        </article>
      </section>

      <section className="priceSection panel" id="prices">
        <div className="panelTitle">
          <div>
            <span>{t.navPrices}</span>
            <h2>{t.priceBoard}</h2>
            <p>{t.priceBoardDesc}</p>
          </div>
          <button onClick={market.refresh} disabled={market.loading}>{market.loading ? '...' : t.refresh}</button>
        </div>
        <div className="priceGrid">
          {rows.map((row) => (
            <article className="priceCard" key={row.symbol}>
              <div>
                <span className="coinMark" style={{ background: row.color }} />
                <strong>{row.symbol}</strong>
                <small>{row.pair}</small>
              </div>
              <b>{money(row.price, row.price < 1 ? 4 : 2)}</b>
              <em className={row.change >= 0 ? 'up' : 'down'}>{row.change >= 0 ? '+' : ''}{numeric(row.change)}%</em>
              <span>{money(row.value)}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboardGrid">
        <article className="panel">
          <div className="panelTitle">
            <div>
              <span>{t.distribution}</span>
              <h2>{t.distribution}</h2>
            </div>
          </div>
          <div className="allocationVisual">
            <PieChart rows={rows} />
            <div className="legend">
              {rows.map((row) => (
                <div key={row.symbol}>
                  <span style={{ background: row.color }} />
                  <strong>{row.symbol}</strong>
                  <em>{numeric(row.weight)}%</em>
                </div>
              ))}
            </div>
          </div>
        </article>
        <article className="panel">
          <div className="panelTitle">
            <div>
              <span>{t.trend}</span>
              <h2>{t.trend}</h2>
            </div>
            <strong className={pnl >= 0 ? 'up' : 'down'}>{pnl >= 0 ? '+' : ''}{money(pnl)}</strong>
          </div>
          <Sparkline rows={rows} />
        </article>
      </section>

      <section className="workbench" id="allocation">
        <article className="panel allocationPanel">
          <div className="panelTitle">
            <div>
              <span>{t.navAllocation}</span>
              <h2>{t.allocation}</h2>
              <p>{t.allocationDesc}</p>
            </div>
            <div className="actionCluster">
              <button onClick={() => applyPreset('balanced')}>{t.rebalance}</button>
              <button onClick={() => applyPreset('core')}>{t.selectCore}</button>
            </div>
          </div>
          <div className="allocationCards">
            {rows.map((row) => {
              const asset = assets.find((item) => item.symbol === row.symbol);
              const target = (asset.target / normalizedTargetTotal) * 100;
              const gap = target - row.weight;
              return (
                <article className="allocationCard" key={row.symbol}>
                  <div className="coinHeader">
                    <span className="coinMark" style={{ background: row.color }} />
                    <strong>{row.symbol}</strong>
                    <em className={gap >= 0 ? 'up' : 'down'}>{t.gap} {gap >= 0 ? '+' : ''}{numeric(gap)}%</em>
                  </div>
                  <div className="weightLine">
                    <span>{t.currentWeight} {numeric(row.weight)}%</span>
                    <span>{t.targetWeight} {numeric(target)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={asset.target}
                    onChange={(event) => setTarget(row.symbol, Number(event.target.value))}
                    style={{ accentColor: row.color }}
                  />
                  <small>{t.amount}: {numeric(row.amount, row.amount > 100 ? 0 : 4)} / {t.value}: {money(row.value)}</small>
                </article>
              );
            })}
          </div>
        </article>
      </section>

      <section className="tradeSection panel" id="trade">
        <div className="panelTitle">
          <div>
            <span>{t.navTrade}</span>
            <h2>{t.trade}</h2>
          </div>
          <span className="pill">{t.simulated}</span>
        </div>
        <div className="tradeFlow">
          <article>
            <h3>{t.step1}</h3>
            <div className="coinGrid">
              {rows.map((row) => (
                <button className={selected.includes(row.symbol) ? 'selected' : ''} onClick={() => toggleCoin(row.symbol)} key={row.symbol}>
                  <span style={{ background: row.color }} />
                  {row.symbol}
                </button>
              ))}
            </div>
          </article>
          <article>
            <h3>{t.step2}</h3>
            <div className="formGrid">
              <label>{t.direction}<select value={side} onChange={(event) => setSide(event.target.value)}><option>LONG</option><option>SHORT</option></select></label>
              <label>{t.leverage}<input type="number" min="1" max="20" value={leverage} onChange={(event) => setLeverage(Number(event.target.value))} /></label>
              <label>{t.takeProfit}<input value={takeProfit} onChange={(event) => setTakeProfit(event.target.value)} /></label>
              <label>{t.stopLoss}<input value={stopLoss} onChange={(event) => setStopLoss(event.target.value)} /></label>
              <label>{t.alert}<input value={alertPrice} onChange={(event) => setAlertPrice(event.target.value)} /></label>
            </div>
          </article>
          <article>
            <h3>{t.step3}</h3>
            <div className="orderList">
              {orderPreview.map((order) => (
                <div className="orderRow" key={order.id}>
                  <span>{order.id}</span>
                  <strong>{order.symbol} {order.side}</strong>
                  <em>{order.leverage}x</em>
                  <b>{money(order.notional)}</b>
                </div>
              ))}
              {!orderPreview.length && <p className="emptyState">Select at least one coin.</p>}
            </div>
            <button className="primary full">{t.generate}</button>
          </article>
        </div>
      </section>

      <section className="note panel">
        <span>{t.note}</span>
        <p>{t.noteBody}</p>
      </section>
    </main>
  );
}

export default App;
