import { createChart } from "lightweight-charts";

const chartEl = document.getElementById("chart");
const volumeChartEl = document.getElementById("volume-chart");

console.log("chartEl =", chartEl);
console.log("volumeChartEl =", volumeChartEl);

if (!chartEl || !volumeChartEl) {
  throw new Error("找不到 chart 容器");
}

const chart = createChart(chartEl as HTMLDivElement, {
  width: chartEl.clientWidth,
  height: chartEl.clientHeight,
});

console.log("chart =", chart);

async function fetchData() {
  const url = 
    "/data/lpl/lol-al-blg-2026-02-06/lol-al-blg-2026-02-06_trades_subgraph.csv";
  console.log("fetching data from", url);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const csvText = await response.text();
  console.log("csvText =", csvText.slice(0, 200)); // 只打印前200字符

  return csvText;
}

fetchData();
// get event slug from url and load series meta to get winner
function getEventSlug(path: string): string{
  const parts = path.split("/");
  const filename = parts.pop(); // 移除文件名
  if (!filename) {
    throw new Error("路径中没有文件名");
  }
  const slug = filename.replace("_trades_subgraph.csv", ""); // 移除 .csv 后缀
  return slug;
}

async function loadSeriesMeta() {
  const res = await fetch("/data/lpl_series_2026.csv");
  const text = await res.text();
  return text;
}

function parseCSV(text: string) {
  const lines = text.trim().split("\n");

  const headers = lines[0].split(",");

  return lines.slice(1).map(line => {
    const values = line.split(",");

    const row: any = {};

    headers.forEach((h, i) => {
      row[h] = values[i];
    });

    return row;
  });
}

function getWinner(seriesRows: any[], slug: string): string | null {
  const row = seriesRows.find((r) => r.event_slug === slug);

  console.log("lookup slug =", slug);
  console.log("matched row =", row);

  if (!row) return null;

  return row.resolved_winner ?? null;
}

async function testWinner() {
  // 1️⃣ 這就是你目前 fetch trades 的 path
  const tradesPath =
    "/data/lpl/lol-al-blg-2026-02-06/lol-al-blg-2026-02-06_trades_subgraph.csv";

  // 2️⃣ 從 path 取出 slug
  const slug = getEventSlug(tradesPath);
  console.log("event_slug =", slug);

  // 3️⃣ 讀 metadata csv
  const seriesCSV = await loadSeriesMeta();
  console.log("seriesCSV sample =", seriesCSV.slice(0, 200));

  // 4️⃣ parse csv
  const seriesRows = parseCSV(seriesCSV);
  console.log("seriesRows sample =", seriesRows.slice(0, 3));

  // 5️⃣ 找 winner
  const winner = getWinner(seriesRows, slug);

  console.log("winner =", winner);
}

testWinner();