/* =====================================================================
   main.js
   Navigation, dark/light theme, and every chart and table on the page.
   All numbers are read from RESULTS (results-data.js), which comes from
   the executed notebook outputs.
   ===================================================================== */

const charts = new Map();

/* ---------------------------- Theme -------------------------------- */

function getPreferredTheme() {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.setAttribute("aria-label", "Switch to " + (theme === "dark" ? "light" : "dark") + " theme");
    btn.textContent = theme === "dark" ? "☀️" : "🌙";
  }
  // Re-render charts so axis/label colours follow the theme.
  buildAllCharts();
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function palette() {
  return {
    text: cssVar("--text"),
    muted: cssVar("--muted"),
    grid: cssVar("--chart-grid"),
    primary: cssVar("--primary"),
    primarySoft: cssVar("--primary-soft"),
    red: cssVar("--red"),
    redSoft: cssVar("--red-soft"),
    green: cssVar("--green"),
    greenSoft: cssVar("--green-soft"),
    amber: cssVar("--amber")
  };
}

/* --------------------------- Charts -------------------------------- */

function makeChart(id, config) {
  const canvas = document.getElementById(id);
  if (!canvas || typeof Chart === "undefined") return;
  if (charts.has(id)) charts.get(id).destroy();

  Chart.defaults.font.family =
    "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = palette().muted;

  charts.set(id, new Chart(canvas.getContext("2d"), config));
}

function baseScales(orientation) {
  const p = palette();
  const valueAxis = {
    grid: { color: p.grid },
    ticks: { color: p.muted }
  };
  const categoryAxis = {
    grid: { display: false },
    ticks: { color: p.muted, autoSkip: false }
  };
  return orientation === "horizontal"
    ? { x: { ...valueAxis, beginAtZero: true }, y: { ...categoryAxis } }
    : { x: { ...categoryAxis }, y: { ...valueAxis, beginAtZero: true } };
}

function chartOptions(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600 },
    plugins: {
      legend: { labels: { color: palette().text, usePointStyle: true } },
      tooltip: { padding: 10 }
    },
    ...extra
  };
}

function buildAllCharts() {
  const p = palette();
  const D = RESULTS.dataset;
  const M = RESULTS.models;

  /* 1. Dataset class distribution: original vs after deduplication */
  makeChart("chart-class-distribution", {
    type: "bar",
    data: {
      labels: ["Original (100,077 rows)", "After removing duplicates (21,891 rows)"],
      datasets: [
        { label: "Legitimate (0)", data: [D.originalLegit, D.cleanedLegit],
          backgroundColor: p.green, borderRadius: 6 },
        { label: "Phishing (1)", data: [D.originalPhishing, D.cleanedPhishing],
          backgroundColor: p.red, borderRadius: 6 }
      ]
    },
    options: chartOptions({
      scales: baseScales("vertical"),
      plugins: {
        legend: { labels: { color: p.text, usePointStyle: true } },
        tooltip: { callbacks: { label: (c) => c.dataset.label + ": " + c.parsed.y.toLocaleString() } }
      }
    })
  });

  /* 2. Average URL length (notebook cell 3) */
  makeChart("chart-url-length", {
    type: "bar",
    data: {
      labels: ["Legitimate", "Phishing"],
      datasets: [{
        label: "Average URL length (characters)",
        data: [RESULTS.averages.urlLength.legit, RESULTS.averages.urlLength.phishing],
        backgroundColor: [p.green, p.red],
        borderRadius: 6,
        barThickness: 54
      }]
    },
    options: chartOptions({ plugins: { legend: { display: false } }, scales: baseScales("vertical") })
  });

  /* 3. Average slashes (notebook cell 5) */
  makeChart("chart-slashes", {
    type: "bar",
    data: {
      labels: ["Legitimate", "Phishing"],
      datasets: [{
        label: "Average number of slashes",
        data: [RESULTS.averages.slashes.legit, RESULTS.averages.slashes.phishing],
        backgroundColor: [p.green, p.red],
        borderRadius: 6,
        barThickness: 54
      }]
    },
    options: chartOptions({ plugins: { legend: { display: false } }, scales: baseScales("vertical") })
  });

  /* 4. Correlation with the label (notebook cell 4) */
  makeChart("chart-correlation", {
    type: "bar",
    data: {
      labels: RESULTS.correlations.map((c) => c.feature),
      datasets: [{
        label: "Correlation with phishing label",
        data: RESULTS.correlations.map((c) => c.value),
        backgroundColor: RESULTS.correlations.map((c) => (c.value < 0 ? p.amber : p.primary)),
        borderRadius: 4
      }]
    },
    options: chartOptions({ indexAxis: "y", plugins: { legend: { display: false } },
      scales: baseScales("horizontal") })
  });

  /* 5. Accuracy comparison + honest baseline */
  const baseline = Math.round(D.testPhishingShare * 10000) / 100;
  makeChart("chart-accuracy", {
    type: "bar",
    data: {
      labels: ["Decision Tree", "Random Forest", 'Baseline: always answer "phishing"'],
      datasets: [{
        label: "Accuracy on the 4,368-row test set (%)",
        data: [M.decisionTree.accuracyRaw * 100, M.randomForest.accuracyRaw * 100, baseline],
        backgroundColor: [p.primarySoft, p.primary, p.amber],
        borderColor: [p.primary, p.primary, p.amber],
        borderWidth: [1, 2, 1],
        borderRadius: 6,
        barThickness: 64
      }]
    },
    options: chartOptions({
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => c.parsed.y.toFixed(2) + "%" } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: p.muted } },
        y: { min: 0, max: 100, grid: { color: p.grid }, ticks: { color: p.muted, callback: (v) => v + "%" } }
      }
    })
  });

  /* 6. Precision / recall / F1 per model */
  const metricOptions = (title) => chartOptions({
    plugins: {
      legend: { labels: { color: p.text, usePointStyle: true } },
      title: { display: true, text: title, color: p.text, font: { size: 13, weight: "600" } }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: p.muted } },
      y: { min: 0, max: 1, grid: { color: p.grid }, ticks: { color: p.muted, callback: (v) => v.toFixed(1) } }
    }
  });

  makeChart("chart-metrics-phishing", {
    type: "bar",
    data: {
      labels: ["Precision", "Recall", "F1-score"],
      datasets: [
        { label: "Decision Tree", data: [M.decisionTree.phishing.precision, M.decisionTree.phishing.recall, M.decisionTree.phishing.f1],
          backgroundColor: p.primarySoft, borderColor: p.primary, borderWidth: 1, borderRadius: 5 },
        { label: "Random Forest", data: [M.randomForest.phishing.precision, M.randomForest.phishing.recall, M.randomForest.phishing.f1],
          backgroundColor: p.red, borderRadius: 5 }
      ]
    },
    options: metricOptions("Class = Phishing (1)")
  });

  makeChart("chart-metrics-legit", {
    type: "bar",
    data: {
      labels: ["Precision", "Recall", "F1-score"],
      datasets: [
        { label: "Decision Tree", data: [M.decisionTree.legit.precision, M.decisionTree.legit.recall, M.decisionTree.legit.f1],
          backgroundColor: p.primarySoft, borderColor: p.primary, borderWidth: 1, borderRadius: 5 },
        { label: "Random Forest", data: [M.randomForest.legit.precision, M.randomForest.legit.recall, M.randomForest.legit.f1],
          backgroundColor: p.red, borderRadius: 5 }
      ]
    },
    options: metricOptions("Class = Legitimate (0)")
  });

  /* 7. Feature importance - top 10 (notebook cell 11) */
  const top10 = RESULTS.importances.slice(0, 10);
  makeChart("chart-importance", {
    type: "bar",
    data: {
      labels: top10.map((i) => i.feature),
      datasets: [{
        label: "Random Forest feature importance",
        data: top10.map((i) => i.value),
        backgroundColor: top10.map((_, idx) => (idx < 3 ? p.red : p.primary)),
        borderRadius: 5
      }]
    },
    options: chartOptions({ indexAxis: "y", plugins: { legend: { display: false } },
      scales: baseScales("horizontal") })
  });
}

/* --------------------------- Tables -------------------------------- */

function confusionCells(c, label) {
  const total = c.tn + c.fp + c.fn + c.tp;
  const pct = (n) => ((n / total) * 100).toFixed(1) + "%";
  return {
    head: `<th>Predicted legitimate</th><th>Predicted phishing</th>`,
    rows: `
      <tr><td>Actually legitimate</td>
          <td class="num cell-good" title="${pct(c.tn)} correct">${c.tn}</td>
          <td class="num cell-bad" title="${pct(c.fp)} false positives">${c.fp}</td></tr>
      <tr><td>Actually phishing</td>
          <td class="num cell-bad" title="${pct(c.fn)} false negatives">${c.fn}</td>
          <td class="num cell-good" title="${pct(c.tp)} correct">${c.tp}</td></tr>`,
    label
  };
}

function renderTables() {
  const M = RESULTS.models;
  const D = RESULTS.dataset;

  /* Confusion matrices */
  ["decisionTree", "randomForest"].forEach((key) => {
    const m = M[key];
    const el = document.getElementById("confusion-" + key);
    if (el) {
      const cells = confusionCells(m.confusion, m.label);
      el.innerHTML =
        `<div class="table-wrap"><table class="data-table confusion">` +
        `<thead><tr><th class="corner">${m.label}</th>${cells.head}</tr></thead>` +
        `<tbody>${cells.rows}</tbody></table></div>` +
        `<p class="muted small">${m.confusion.tn + m.confusion.tp} correct · ` +
        `${m.confusion.fp + m.confusion.fn} wrong · of ${m.confusion.tn + m.confusion.fp + m.confusion.fn + m.confusion.tp} test URLs</p>`;
    }
  });

  /* Classification report table */
  const report = document.getElementById("classification-report");
  if (report) {
    const row = (m) => {
      const line = (label, x, support) =>
        `<tr><td>${label}</td><td class="num">${x.precision.toFixed(2)}</td>` +
        `<td class="num">${x.recall.toFixed(2)}</td><td class="num">${x.f1.toFixed(2)}</td>` +
        `<td class="num">${support}</td></tr>`;
      return (
        `<tr class="group-row"><td colspan="5">${m.label} — ${m.accuracyPct} accuracy</td></tr>` +
        line("Legitimate (0)", m.legit, m.legit.support) +
        line("Phishing (1)", m.phishing, m.phishing.support) +
        `<tr class="avg-row"><td>Macro average</td>` +
        `<td class="num">${m.macroAvg.precision.toFixed(2)}</td>` +
        `<td class="num">${m.macroAvg.recall.toFixed(2)}</td>` +
        `<td class="num">${m.macroAvg.f1.toFixed(2)}</td><td class="num">4368</td></tr>` +
        `<tr class="avg-row"><td>Weighted average</td>` +
        `<td class="num">${m.weightedAvg.precision.toFixed(2)}</td>` +
        `<td class="num">${m.weightedAvg.recall.toFixed(2)}</td>` +
        `<td class="num">${m.weightedAvg.f1.toFixed(2)}</td><td class="num">4368</td></tr>`
      );
    };
    report.innerHTML =
      `<thead><tr><th>Class</th><th class="num">Precision</th>` +
      `<th class="num">Recall</th><th class="num">F1-score</th>` +
      `<th class="num">Support</th></tr></thead><tbody>` +
      row(M.decisionTree) + row(M.randomForest) + `</tbody>`;
  }

  /* Feature importance + correlation tables */
  const info = RESULTS.featureInfo;
  const impBody = document.getElementById("importance-table-body");
  if (impBody) {
    impBody.innerHTML = RESULTS.importances.map((i, idx) => {
      const corr = RESULTS.correlations.find((c) => c.feature === i.feature);
      const pct = (i.value * 100).toFixed(2) + "%";
      const bar = `<span class="mini-bar"><span style="width:${(i.value / RESULTS.importances[0].value * 100).toFixed(1)}%"></span></span>`;
      return (
        `<tr><td class="num rank">${idx + 1}</td>` +
        `<td><code>${i.feature}</code></td>` +
        `<td>${info[i.feature].label}</td>` +
        `<td class="num">${pct}</td><td class="bar-cell">${bar}</td>` +
        `<td class="num ${corr && corr.value < 0 ? "neg" : ""}">` +
        (corr ? corr.value.toFixed(3) : "—") + `</td></tr>`
      );
    }).join("");
  }

  /* Dataset statistics list */
  const stats = document.getElementById("dataset-stats");
  if (stats) {
    const items = [
      ["Original records", D.originalRows.toLocaleString()],
      ["URL features", D.features],
      ["Missing values", D.missingValues],
      ["Duplicate records removed", D.duplicateRows.toLocaleString()],
      ["Rows with conflicting labels", D.conflictingLabels.toLocaleString()],
      ["Records used for modelling", D.cleanedRows.toLocaleString()],
      ["Train / test split", D.trainRows.toLocaleString() + " / " + D.testRows.toLocaleString()],
      ["Feature rows shared between splits", D.sharedFeatureGroups]
    ];
    stats.innerHTML = items
      .map(([k, v]) => `<div class="stat-item"><span>${k}</span><strong>${v}</strong></div>`)
      .join("");
  }

  /* Original notebook output images */
  const gallery = document.getElementById("notebook-gallery");
  if (gallery) {
    gallery.innerHTML = RESULTS.notebookImages
      .map(
        (img) =>
          `<figure class="nb-figure"><a href="${img.src}" target="_blank" rel="noopener">` +
          `<img src="${img.src}" alt="${img.title}" loading="lazy"></a>` +
          `<figcaption><strong>${img.title}</strong><span>${img.cell} output</span></figcaption></figure>`
      )
      .join("");
  }

  /* Dashboard headline numbers */
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  set("stat-dt-accuracy", M.decisionTree.accuracyPct);
  set("stat-rf-accuracy", M.randomForest.accuracyPct);
  set("stat-rows", D.originalRows.toLocaleString());
  set("stat-features", D.features);
  set("hero-accuracy", M.randomForest.accuracyPct);

  /* Difference callout: 51 more URLs correct */
  const dtCorrect = M.decisionTree.confusion.tn + M.decisionTree.confusion.tp;
  const rfCorrect = M.randomForest.confusion.tn + M.randomForest.confusion.tp;
  const delta = document.getElementById("accuracy-delta");
  if (delta) {
    delta.textContent =
      `On the same 4,368 test URLs the Random Forest got ${rfCorrect} right and the ` +
      `Decision Tree got ${dtCorrect} — ${rfCorrect - dtCorrect} more correct predictions, ` +
      `a gap of ${((M.randomForest.accuracyRaw - M.decisionTree.accuracyRaw) * 100).toFixed(2)} ` +
      `percentage points.`;
  }
}

/* ------------------------ Navigation UI ----------------------------- */

function initNav() {
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  // Highlight the section currently being viewed
  const links = Array.from(document.querySelectorAll(".nav-link"));
  const sections = links
    .map((l) => document.querySelector(l.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((l) =>
            l.classList.toggle("active", l.getAttribute("href") === "#" + entry.target.id)
          );
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => spy.observe(s));
  }

  // Gentle reveal-on-scroll for cards and sections
  const revealables = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const revealer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            revealer.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px" }
    );
    revealables.forEach((el) => revealer.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add("revealed"));
  }
}

/* ----------------------------- Boot --------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }
  applyTheme(getPreferredTheme());
  renderTables();
  initNav();
});
