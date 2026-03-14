import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  type IChartApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type Time,
} from 'lightweight-charts';

type MockTrade = {
  time: Time;
  price: number;
  volume: number;
};

const THEME = {
  bg: '#0b1220',
  panel: '#111827',
  text: '#e5e7eb',
  muted: '#94a3b8',
  grid: 'rgba(148,163,184,0.12)',
  border: 'rgba(148,163,184,0.18)',
  green: '#22c55e',
  red: '#ef4444',
  cyan: '#22d3ee',
  pink: '#f472b6',
  yellow: '#facc15',
  blueBar: 'rgba(96,165,250,0.65)',
};

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element: #${id}`);
  return node as T;
}

function formatNumber(value: number, digits = 4): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatInt(value: number): string {
  return value.toLocaleString('en-US');
}

function generateMockTrades(count = 120): MockTrade[] {
  const nowSec = Math.floor(Date.now() / 1000);
  const startSec = nowSec - count * 300; // 5 分鐘一根

  let price = 0.54;
  const data: MockTrade[] = [];

  for (let i = 0; i < count; i += 1) {
    const drift = (Math.random() - 0.5) * 0.05;
    price = Math.max(0.08, Math.min(0.92, price + drift));

    const volumeBase = 200 + Math.random() * 1000;
    const volumeBoost = i > 75 ? Math.random() * 800 : 0;

    data.push({
      time: (startSec + i * 300) as Time,
      price: Number(price.toFixed(4)),
      volume: Number((volumeBase + volumeBoost).toFixed(2)),
    });
  }

  return data;
}

function tradesToCandles(trades: MockTrade[]): CandlestickData[] {
  return trades.map((t, i) => {
    const prev = i === 0 ? t.price : trades[i - 1].price;
    const open = prev;
    const close = t.price;
    const wiggle = Math.max(0.01, Math.abs(close - open) * 0.8 + Math.random() * 0.02);
    const high = Math.min(1, Math.max(open, close) + wiggle);
    const low = Math.max(0, Math.min(open, close) - wiggle);

    return {
      time: t.time,
      open: Number(open.toFixed(4)),
      high: Number(high.toFixed(4)),
      low: Number(low.toFixed(4)),
      close: Number(close.toFixed(4)),
    };
  });
}

function tradesToCloseLine(trades: MockTrade[]): LineData[] {
  return trades.map((t) => ({ time: t.time, value: t.price }));
}

function tradesToVolume(trades: MockTrade[]): HistogramData[] {
  return trades.map((t, i) => ({
    time: t.time,
    value: t.volume,
    color: i === 0 || t.price >= trades[i - 1].price ? THEME.green : THEME.red,
  }));
}

function createBaseChart(container: HTMLElement, height: number): IChartApi {
  return createChart(container, {
    autoSize: true,
    height,
    layout: {
      background: { type: ColorType.Solid, color: THEME.panel },
      textColor: THEME.text,
    },
    grid: {
      vertLines: { color: THEME.grid },
      horzLines: { color: THEME.grid },
    },
    crosshair: {
      vertLine: {
        color: 'rgba(148,163,184,0.55)',
        labelBackgroundColor: '#1e293b',
      },
      horzLine: {
        color: 'rgba(148,163,184,0.55)',
        labelBackgroundColor: '#1e293b',
      },
    },
    rightPriceScale: {
      borderColor: THEME.border,
    },
    timeScale: {
      borderColor: THEME.border,
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 8,
      barSpacing: 10,
    },
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
      horzTouchDrag: true,
      vertTouchDrag: true,
    },
    handleScale: {
      mouseWheel: true,
      pinch: true,
      axisPressedMouseMove: true,
      axisDoubleClickReset: true,
    },
  });
}

function syncVisibleRange(source: IChartApi, target: IChartApi): void {
  source.timeScale().subscribeVisibleLogicalRangeChange((range) => {
    if (range) target.timeScale().setVisibleLogicalRange(range);
  });
}

function setMockSummary(trades: MockTrade[]): void {
  const last = trades[trades.length - 1];
  const first = trades[0];
  const min = Math.min(...trades.map((t) => t.price));
  const max = Math.max(...trades.map((t) => t.price));
  const totalVolume = trades.reduce((sum, t) => sum + t.volume, 0);

  el('current-match').textContent = 'demo-btcusdt-mock';
  el('current-bucket').textContent = '5 分鐘';
  el('trade-count').textContent = `${formatInt(trades.length)} 筆測試資料`;

  const metricLabels = ['最新價格', '價格區間', '總成交量', '漲跌'];
  const metricValues = [
    formatNumber(last.price),
    `${formatNumber(min)} ~ ${formatNumber(max)}`,
    `${formatInt(Math.round(totalVolume))} USDC`,
    `${(((last.price - first.price) / first.price) * 100).toFixed(2)}%`,
  ];
  const metricDescs = [
    '目前顯示測試 close price',
    '這批假資料的 low ~ high',
    'volume-chart 使用同一批資料',
    '用第一筆與最後一筆計算',
  ];

  const labels = Array.from(document.querySelectorAll<HTMLElement>('.metric-label'));
  const values = Array.from(document.querySelectorAll<HTMLElement>('.metric-value'));
  const descs = Array.from(document.querySelectorAll<HTMLElement>('.metric-desc'));

  metricLabels.forEach((text, i) => {
    if (labels[i]) labels[i].textContent = text;
    if (values[i]) values[i].textContent = metricValues[i];
    if (descs[i]) descs[i].textContent = metricDescs[i];
  });
}

function setMockTable(trades: MockTrade[]): void {
  const tbody = document.querySelector<HTMLTableSectionElement>('tbody');
  if (!tbody) return;

  tbody.innerHTML = trades
    .slice(-20)
    .reverse()
    .map((t, i) => {
      const d = new Date(Number(t.time) * 1000);
      const dt = d.toLocaleString('sv-SE').replace('T', ' ');
      const team = i % 2 === 0 ? 'Top Esports' : 'Weibo Gaming';
      return `
        <tr>
          <td>${dt}</td>
          <td>${team}</td>
          <td>${formatNumber(t.price)}</td>
          <td>${formatInt(Math.round(t.volume))}</td>
        </tr>
      `;
    })
    .join('');
}

function main(): void {
  const chartContainer = el<HTMLDivElement>('chart');
  const volumeContainer = el<HTMLDivElement>('volume-chart');

  const trades = generateMockTrades();
  const candles = tradesToCandles(trades);
  const closeLine = tradesToCloseLine(trades);
  const volumes = tradesToVolume(trades);

  const mainChart = createBaseChart(chartContainer, chartContainer.clientHeight || 420);
  const volumeChart = createBaseChart(volumeContainer, volumeContainer.clientHeight || 160);

  const candleSeries = mainChart.addSeries(CandlestickSeries, {
    upColor: THEME.green,
    downColor: THEME.red,
    borderUpColor: THEME.green,
    borderDownColor: THEME.red,
    wickUpColor: THEME.green,
    wickDownColor: THEME.red,
    priceLineVisible: false,
  });

  const lineSeries = mainChart.addSeries(LineSeries, {
    color: THEME.cyan,
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: true,
  });

  const volumeSeries = volumeChart.addSeries(HistogramSeries, {
    priceFormat: {
      type: 'volume',
    },
    priceScaleId: '',
  });

  candleSeries.setData(candles);
  lineSeries.setData(closeLine);
  volumeSeries.setData(volumes);

  mainChart.timeScale().fitContent();
  volumeChart.timeScale().fitContent();
  syncVisibleRange(mainChart, volumeChart);
  syncVisibleRange(volumeChart, mainChart);

  volumeChart.priceScale('').applyOptions({
    scaleMargins: {
      top: 0.12,
      bottom: 0,
    },
  });

  mainChart.applyOptions({
    localization: {
      priceFormatter: (price: number) => price.toFixed(4),
    },
  });

  volumeSeries.applyOptions({
    base: 0,
    color: THEME.blueBar,
  });

  setMockSummary(trades);
  setMockTable(trades);

  window.addEventListener('resize', () => {
    mainChart.timeScale().fitContent();
    volumeChart.timeScale().fitContent();
  });
}

main();
