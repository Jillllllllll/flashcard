/**
 * Rebuild ../words.js adding Traditional Chinese (zh) per entry.
 *   node scripts/fill-zh.mjs
 */
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const WORDS_JS = path.join(ROOT, "words.js");

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "vocab-flashcards/1.0" } }, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(d));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const hasCJK = (s) => /[\u4e00-\u9fff]/.test(s);

async function translateLine(q) {
  const u =
    "https://api.mymemory.translated.net/get?q=" +
    encodeURIComponent(q.slice(0, 450)) +
    "&langpair=en|zh-TW";
  const j = await httpsGetJson(u);
  if (j.responseStatus !== 200) throw new Error(String(j.responseStatus));
  return String(j.responseData?.translatedText || "").trim();
}

async function glossForEntry(word, definition) {
  let zh = await translateLine(word);
  await sleep(300);
  const wlow = word.toLowerCase();
  if (!hasCJK(zh) || zh.toLowerCase() === wlow) {
    const snippet = definition.replace(/\s+/g, " ").trim().slice(0, 200);
    zh = await translateLine(snippet);
    await sleep(300);
  }
  zh = zh.replace(/\s+/g, " ").trim();
  const cut = zh.split(/[。；\n]/)[0];
  if (cut.length >= 8 && cut.length <= 120) zh = cut;
  if (zh.length > 100) zh = zh.slice(0, 97) + "…";
  return zh;
}

function loadVocab() {
  const txt = fs.readFileSync(WORDS_JS, "utf8");
  const json = txt.replace(/^\s*window\.VOCAB\s*=\s*/, "").replace(/;\s*$/, "");
  return JSON.parse(json);
}

function saveVocab(arr) {
  fs.writeFileSync(WORDS_JS, "window.VOCAB = " + JSON.stringify(arr) + ";\n", "utf8");
}

const vocab = loadVocab();
for (let i = 0; i < vocab.length; i++) {
  const e = vocab[i];
  if (e.zh && hasCJK(String(e.zh))) {
    console.log(i + 1, "/", vocab.length, "skip", e.word);
    continue;
  }
  process.stdout.write(`${i + 1}/${vocab.length} ${e.word} … `);
  try {
    const zh = await glossForEntry(e.word, e.definition);
    vocab[i] = { ...e, zh };
    console.log(zh.slice(0, 44) + (zh.length > 44 ? "…" : ""));
  } catch (err) {
    console.error("ERR", err.message);
    vocab[i] = { ...e, zh: `（請查字典：${e.word}）` };
  }
  if ((i + 1) % 40 === 0) saveVocab(vocab);
  await sleep(50);
}

saveVocab(vocab);
console.log("Done.", vocab.length);
