// Ad-hoc probe: node scripts/qa/probe.mjs "<js expression>" [width] [height] [url] [touch]
import { launch, sleep } from "./cdp.mjs";

const [, , expr, w = "1440", h = "900", url = process.env.BASE ?? "http://127.0.0.1:4173/", touch = "0"] = process.argv;
const b = await launch({ width: Number(w), height: Number(h), port: 9500 + Math.floor(Math.random() * 400) });
await b.viewport(Number(w), Number(h), { mobile: touch === "1", dpr: 1, touch: touch === "1" });
await b.go(url, 3500);
await sleep(1200);
try {
  console.log(await b.eval(expr));
} catch (e) {
  console.log("EVAL ERROR:", e.message);
}
console.log("logs:", b.logs.slice(-12));
await b.close();
