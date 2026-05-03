(function () {
  "use strict";

  /** @typedef {{ word: string, definition: string, pos: string | null }} Entry */

  function randInt(n) {
    return Math.floor(Math.random() * n);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function buildOrder(n) {
    return shuffle(Array.from({ length: n }, (_, i) => i));
  }

  /**
   * @param {Entry[]} vocab
   * @param {number} answerIdx
   */
  function buildQuestion(vocab, answerIdx) {
    const n = vocab.length;
    const correct = vocab[answerIdx];
    const defs = new Set([correct.definition]);
    const pool = [correct.definition];
    let guard = 0;
    while (pool.length < 4 && guard < 6000) {
      guard++;
      const j = randInt(n);
      if (j === answerIdx) continue;
      const d = vocab[j].definition;
      if (defs.has(d)) continue;
      defs.add(d);
      pool.push(d);
    }
    while (pool.length < 4) {
      const j = randInt(n);
      if (j === answerIdx) continue;
      pool.push(vocab[j].definition);
    }
    return {
      word: correct.word,
      pos: correct.pos,
      definitions: shuffle(pool),
      correctDef: correct.definition,
    };
  }

  const vocab = window.VOCAB;
  if (!Array.isArray(vocab) || vocab.length < 4) {
    document.querySelector(".wrap").innerHTML =
      '<p class="hint" style="padding:2rem">詞庫未載入：請確認 <code>words.js</code> 與本頁同目錄。</p>';
    return;
  }

  const elWord = document.getElementById("word-title");
  const elPos = document.getElementById("word-pos");
  const elChoices = document.getElementById("choices");
  const elNext = document.getElementById("btn-next");
  const elSkip = document.getElementById("btn-skip");
  const elBtnRandom = document.getElementById("btn-random");
  const elBtnSeq = document.getElementById("btn-seq");
  const elNTotal = document.getElementById("n-total");
  const elNOk = document.getElementById("n-ok");
  const elNAll = document.getElementById("n-all");
  const elNPct = document.getElementById("n-pct");
  const elStreak = document.getElementById("n-streak");
  const elBest = document.getElementById("n-best");

  elNTotal.textContent = String(vocab.length);

  let mode = "random";
  let order = buildOrder(vocab.length);
  let seqPos = 0;
  /** @type {ReturnType<typeof buildQuestion> | null} */
  let current = null;
  let picked = null;
  const stats = { ok: 0, total: 0, streak: 0, best: 0 };

  function renderStats() {
    elNOk.textContent = String(stats.ok);
    elNAll.textContent = String(stats.total);
    if (stats.total === 0) elNPct.textContent = "—";
    else elNPct.textContent = String(Math.round((stats.ok / stats.total) * 1000) / 10) + "%";
    elStreak.textContent = String(stats.streak);
    elBest.textContent = String(stats.best);
  }

  function nextIndex() {
    if (mode === "random") return randInt(vocab.length);
    const idx = order[seqPos] ?? 0;
    seqPos += 1;
    if (seqPos >= order.length) {
      order = buildOrder(vocab.length);
      seqPos = 0;
    }
    return idx;
  }

  function showQuestion() {
    picked = null;
    const idx = nextIndex();
    current = buildQuestion(vocab, idx);
    elWord.textContent = current.word;
    if (current.pos) {
      elPos.textContent = current.pos;
      elPos.hidden = false;
    } else {
      elPos.textContent = "";
      elPos.hidden = true;
    }
    elChoices.innerHTML = "";
    current.definitions.forEach(function (def, i) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice";
      btn.innerHTML =
        '<span class="key">' +
        (i + 1) +
        '</span><span class="txt"></span>';
      btn.querySelector(".txt").textContent = def;
      btn.addEventListener("click", function () {
        onPick(def, btn);
      });
      li.appendChild(btn);
      elChoices.appendChild(li);
    });
    elNext.hidden = true;
    elChoices.querySelectorAll(".choice").forEach(function (b) {
      b.disabled = false;
    });
  }

  function onPick(def, btn) {
    if (picked || !current) return;
    picked = def;
    const ok = def === current.correctDef;
    if (ok) {
      stats.ok += 1;
      stats.streak += 1;
      stats.best = Math.max(stats.best, stats.streak);
    } else {
      stats.streak = 0;
    }
    stats.total += 1;
    renderStats();

    elChoices.querySelectorAll(".choice").forEach(function (b) {
      b.disabled = true;
      const text = b.querySelector(".txt").textContent;
      b.classList.remove("ok", "bad");
      if (text === current.correctDef) b.classList.add("ok");
      else if (b === btn && text === def) b.classList.add("bad");
    });
    elNext.hidden = false;
  }

  elNext.addEventListener("click", showQuestion);
  elSkip.addEventListener("click", showQuestion);

  function setMode(next) {
    mode = next;
    const isRand = next === "random";
    elBtnRandom.classList.toggle("is-on", isRand);
    elBtnSeq.classList.toggle("is-on", !isRand);
    elBtnRandom.setAttribute("aria-pressed", isRand ? "true" : "false");
    elBtnSeq.setAttribute("aria-pressed", isRand ? "false" : "true");
    order = buildOrder(vocab.length);
    seqPos = 0;
    showQuestion();
  }

  elBtnRandom.addEventListener("click", function () {
    setMode("random");
  });
  elBtnSeq.addEventListener("click", function () {
    setMode("sequential");
  });

  document.addEventListener("keydown", function (e) {
    if (!current) return;
    const k = e.key;
    if (!picked) {
      const n = Number(k);
      if (n >= 1 && n <= 4) {
        const btn = elChoices.querySelectorAll(".choice")[n - 1];
        if (btn && !btn.disabled) btn.click();
      }
      return;
    }
    if (k === "Enter" || k === " ") {
      e.preventDefault();
      showQuestion();
    }
  });

  showQuestion();
})();
