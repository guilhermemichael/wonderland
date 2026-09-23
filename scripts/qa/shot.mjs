// node scripts/qa/shot.mjs <file> [w] [h] [url] [touch] [scrollExpr]
import { launch, sleep } from "./cdp.mjs";

const [, , file, w = "1440", h = "900", url = process.env.BASE ?? "http://127.0.0.1:4173/", touch = "0", scroll = "", dpr = "1"] =
  process.argv;
const b = await launch({ width: Number(w), height: Number(h), port: 9600 + Math.floor(Math.random() * 300) });
await b.viewport(Number(w), Number(h), { mobile: touch === "1", dpr: Number(dpr), touch: touch === "1" });
await b.go(url, 3500);
if (scroll) {
  await b.eval(scroll);
  await sleep(1800);
}
await sleep(600);
await b.shot(file);
console.log("saved", file, "logs:", b.logs.slice(-6));
await b.close();
