import { createChart, CandlestickSeries, ColorType } from 'lightweight-charts';
import type { CandlestickData, UTCTimestamp } from 'lightweight-charts';

// ============================================
// 1. CREATE THE CHART
// ============================================

const chart = createChart(document.getElementById('chart')!, {
  autoSize: true,
  layout: {
    background: { type: ColorType.Solid, color: '#131722' },
    textColor: '#d1d4dc',
  },
  grid: {
    vertLines: { color: '#1f2943' },
    horzLines: { color: '#1f2943' },
  },
  crosshair: {
    mode: 0, // Normal mode - no snapping to prices
    vertLine: { color: '#758696', labelBackgroundColor: '#4c525e' },
    horzLine: { color: '#758696', labelBackgroundColor: '#4c525e' },
  },
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
    rightOffset: 10,
  },
});

// ============================================
// 2. ADD CANDLESTICK SERIES
// ============================================

const candleSeries = chart.addSeries(CandlestickSeries, {
  upColor: '#26a69a',
  downColor: '#ef5350',
  borderUpColor: '#26a69a',
  borderDownColor: '#ef5350',
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
});

// ============================================
// 3. BINANCE API CONFIGURATION
// ============================================

const SYMBOL = 'BTCUSDT';
const INTERVAL = '1m';

// Binance REST API for historical data
const REST_URL = `https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=${INTERVAL}&limit=100`;

// Binance WebSocket for real-time updates
const WS_URL = `wss://stream.binance.com:9443/ws/${SYMBOL.toLowerCase()}@kline_${INTERVAL}`;

// ============================================
// 4. FETCH HISTORICAL DATA
// ============================================

// Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
type BinanceKline = [number, string, string, string, string, string, number, ...unknown[]];

async function fetchHistory(): Promise<CandlestickData[]> {
  const response = await fetch(REST_URL);
  const klines: BinanceKline[] = await response.json();

  return klines.map((k) => ({
    time: (k[0] / 1000) as UTCTimestamp, // Convert ms to seconds!
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
  }));
}

// ============================================
// 5. STREAM REAL-TIME UPDATES
// ============================================

// Binance WebSocket kline message format
interface BinanceWsMessage {
  e: string; // Event type
  k: {
    t: number; // Kline start time (ms)
    o: string; // Open price
    h: string; // High price
    l: string; // Low price
    c: string; // Close price
    x: boolean; // Is this kline closed?
  };
}

function connectWebSocket() {
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => console.log('WebSocket connected');

  ws.onmessage = (event) => {
    const msg: BinanceWsMessage = JSON.parse(event.data);
    const k = msg.k;

    // Update chart with latest candle data
    candleSeries.update({
      time: (k.t / 1000) as UTCTimestamp, // Convert ms to seconds!
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
    });
  };

  ws.onclose = () => {
    console.log('WebSocket closed, reconnecting...');
    setTimeout(connectWebSocket, 1000);
  };

  ws.onerror = (error) => console.error('WebSocket error:', error);
}

// ============================================
// 6. INITIALIZE
// ============================================

async function main() {
  // Load historical data
  console.log('Fetching historical data...');
  const history = await fetchHistory();
  candleSeries.setData(history);
  console.log(`Loaded ${history.length} candles`);

  // Start real-time updates
  console.log('Connecting to WebSocket...');
  connectWebSocket();
}

main().catch(console.error);
