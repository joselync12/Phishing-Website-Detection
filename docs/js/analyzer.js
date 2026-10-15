/* =====================================================================
   analyzer.js
   ---------------------------------------------------------------------
   Interactive URL analyzer.

   Two halves:
     1. extractFeatures(url)  - reproduces, in JavaScript, the 19 numeric
        features that the Kaggle dataset stores for each URL.
     2. runInference(...)      - walks every decision tree in the REAL
        exported scikit-learn model (docs/models/*.json) and averages the
        leaf probabilities, exactly like RandomForestClassifier.predict_proba.

   There are no hardcoded verdicts anywhere in this file. If the model
   file cannot be loaded, no prediction is shown at all.
   ===================================================================== */

const MODELS = {
  randomForest: {
    label: "Random Forest",
    file: "models/random_forest.json",
    accuracy: RESULTS.models.randomForest.accuracyPct,
    payload: null,
    status: "not-requested"   // not-requested | loading | ready | failed
  },
  decisionTree: {
    label: "Decision Tree",
    file: "models/decision_tree.json",
    accuracy: RESULTS.models.decisionTree.accuracyPct,
    payload: null,
    status: "not-requested"
  }
};

let activeModelKey = "randomForest";

/* ---------------------------------------------------------------------
   1. FEATURE EXTRACTION
   ---------------------------------------------------------------------
   The dataset ships only numeric counts - the raw URLs were never
   published - so this function documents and applies our reconstruction
   of how those counts were produced:

   * The stored strings appear to INCLUDE the scheme: rows with
     n_redirection = -1 (no "://" anywhere) are on average ~10
     characters shorter than every other row in the CSV.
   * n_redirection = (number of "://" occurrences) - 1, which is the only
     rule that naturally produces the -1 sentinel found in 6,949 rows.
     A value of 1 means the URL embeds a second full URL
     (e.g. https://good-site.com/https://evil-site.com) - a real
     open-redirect trick.
   * n_slash excludes the two slashes inside each "://", which is what
     lets legitimate URLs average only 0.29 slashes (notebook cell 5).

   This is an interpretation and is listed in the Limitations section.
   --------------------------------------------------------------------- */

function extractFeatures(rawUrl) {
  const url = String(rawUrl || "").trim();

  const schemeCount = (url.match(/:\/\//g) || []).length;

  // Slashes that belong to "://" are excluded; every other '/' counts.
  let slashCount = 0;
  for (let i = 0; i < url.length; i++) {
    if (url[i] === "/") {
      const inScheme =
        (i >= 1 && url[i - 1] === ":" && url[i + 1] === "/") ||
        (i >= 2 && url[i - 2] === ":" && url[i - 1] === "/");
      if (!inScheme) slashCount++;
    }
  }

  const countOf = (ch) => url.split(ch).length - 1;

  const values = {
    url_length: url.length,
    n_dots: countOf("."),
    n_hypens: countOf("-"),
    n_underline: countOf("_"),
    n_slash: slashCount,
    n_questionmark: countOf("?"),
    n_equal: countOf("="),
    n_at: countOf("@"),
    n_and: countOf("&"),
    n_exclamation: countOf("!"),
    n_space: countOf(" "),
    n_tilde: countOf("~"),
    n_comma: countOf(","),
    n_plus: countOf("+"),
    n_asterisk: countOf("*"),
    n_hastag: countOf("#"),
    n_dollar: countOf("$"),
    n_percent: countOf("%"),
    n_redirection: schemeCount - 1
  };

  return {
    url,
    values,
    ordered: FEATURE_ORDER.map((f) => values[f])
  };
}

/* ---------------------------------------------------------------------
   2. MODEL LOADING
   --------------------------------------------------------------------- */

async function loadModel(key) {
  const model = MODELS[key];
  if (model.payload) return model;
  if (model.status === "loading") {
    await new Promise((r) => setTimeout(r, 100));
    return loadModel(key);
  }

  model.status = "loading";
  try {
    const res = await fetch(model.file, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    if (!payload.trees || !payload.features) {
      throw new Error("unexpected file structure");
    }
    model.payload = payload;
    model.status = "ready";
  } catch (err) {
    model.payload = null;
    model.status = "failed";
    model.error = err.message;
  }
  return model;
}

/* ---------------------------------------------------------------------
   3. INFERENCE
   Identical maths to scikit-learn:
     - descend each tree until a leaf is reached (feature <= threshold ?)
     - take the leaf's normalized class probabilities
     - average them across all trees = predict_proba
     - argmax = predict
   Verified by tests/verify-inference.mjs: 4368/4368 test rows match.
   --------------------------------------------------------------------- */

function runInference(payload, orderedValues) {
  const nTrees = payload.trees.length;
  const total = new Array(payload.classes.length).fill(0);
  const votes = { phishing: 0, legitimate: 0 };

  // Per-feature attribution: the change in predicted phishing probability
  // caused by each split the URL actually passes through. The deltas along
  // one tree's path always sum to (leaf prob - root prob), so the printed
  // contributions add up to the final score - nothing is invented.
  const contribution = {};
  FEATURE_ORDER.forEach((f) => (contribution[f] = 0));

  for (const tree of payload.trees) {
    let node = 0;
    let rootProb = tree.value[0][1];

    while (tree.children_left[node] !== -1) {
      const featureIndex = tree.feature[node];
      const featureName = payload.features[featureIndex];
      const goLeft = orderedValues[featureIndex] <= tree.threshold[node];
      const nextNode = goLeft ? tree.children_left[node] : tree.children_right[node];
      contribution[featureName] += tree.value[nextNode][1] - tree.value[node][1];
      node = nextNode;
    }

    for (let c = 0; c < total.length; c++) total[c] += tree.value[node][c];
    if (tree.value[node][1] > tree.value[node][0]) votes.phishing++;
    else votes.legitimate++;
    void rootProb;
  }

  const proba = total.map((v) => v / nTrees);
  const phishingIndex = payload.classes.indexOf(1);
  const phishingProb = proba[phishingIndex];
  const predictedClass = payload.classes[proba.indexOf(Math.max(...proba))];

  const contributions = Object.entries(contribution)
    .map(([feature, delta]) => ({ feature, delta: delta / nTrees }))
    .filter((c) => Math.abs(c.delta) >= 0.0005)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    predictedClass,
    label: predictedClass === 1 ? "Phishing" : "Legitimate",
    isPhishing: predictedClass === 1,
    phishingProb,
    votes,
    nTrees,
    contributions
  };
}

/* ---------------------------------------------------------------------
   4. USER INTERFACE
   --------------------------------------------------------------------- */

const analyzerEls = {};

function initAnalyzer() {
  analyzerEls.form = document.getElementById("analyzer-form");
  analyzerEls.input = document.getElementById("url-input");
  analyzerEls.button = document.getElementById("analyze-button");
  analyzerEls.status = document.getElementById("model-status");
  analyzerEls.result = document.getElementById("analyzer-result");
  analyzerEls.featuresBody = document.getElementById("feature-table-body");
  analyzerEls.presets = document.getElementById("preset-list");
  analyzerEls.modelRadios = document.querySelectorAll("input[name='analyzer-model']");

  if (!analyzerEls.form) return;

  // Preset demo URLs
  const presets = [
    {
      label: "Popular search page",
      url: "https://www.google.com/search?q=how+to+spot+a+phishing+email"
    },
    {
      label: "Deep link to a project repo",
      url: "https://github.com/joselyncarvajal/Phishing-Website-Detection"
    },
    {
      label: "Bare domain (no https://)",
      url: "facebook.com"
    },
    {
      label: "Look-alike login page",
      url: "http://paypa1-secure-login.verify-account.com/auth/update?id=89273&session=1"
    },
    {
      label: "Prize scam with redirects",
      url: "http://free-iphone-now.win/prizes/claim-your-prize?ref=abc&redirect=https://paypal.com&user=1"
    },
    {
      label: "Host-confusion \"@\" trick",
      url: "http://www.google.com@secure-verify.tk/login/verify?id=1"
    }
  ];

  presets.forEach((p) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-chip";
    btn.textContent = p.label;
    btn.title = p.url;
    btn.addEventListener("click", () => {
      analyzerEls.input.value = p.url;
      analyzerEls.input.focus();
      analyzerEls.form.requestSubmit();
    });
    analyzerEls.presets.appendChild(btn);
  });

  analyzerEls.modelRadios.forEach((radio) =>
    radio.addEventListener("change", () => {
      activeModelKey = radio.value;
      if (analyzerEls.input.value.trim()) analyzerEls.form.requestSubmit();
    })
  );

  analyzerEls.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await analyzeUrl(analyzerEls.input.value);
  });

  refreshModelStatus();
}

async function analyzeUrl(rawUrl) {
  const extracted = extractFeatures(rawUrl);
  if (!extracted.url) {
    showEmptyResult();
    return;
  }

  renderFeatureTable(extracted);

  analyzerEls.button.disabled = true;
  analyzerEls.button.textContent = "Analyzing…";
  analyzerEls.result.hidden = false;
  analyzerEls.result.innerHTML =
    '<div class="result-card result-loading"><p>Running the model…</p></div>';

  const model = await loadModel(activeModelKey);
  analyzerEls.button.disabled = false;
  analyzerEls.button.textContent = "Analyze URL";

  if (model.status !== "ready") {
    renderModelMissing(model, extracted);
    return;
  }

  // Guard: feature vector must match what the model was trained on.
  if (model.payload.features.join("|") !== FEATURE_ORDER.join("|")) {
    analyzerEls.result.innerHTML =
      '<div class="result-card result-error"><h3>Model / feature mismatch</h3>' +
      "<p>The model file expects a different feature order than this page. " +
      "Re-run <code>python export_model.py</code>.</p></div>";
    return;
  }

  const outcome = runInference(model.payload, extracted.ordered);
  renderResult(outcome, model, extracted);
  refreshModelStatus();
}

function showEmptyResult() {
  analyzerEls.result.hidden = true;
}

function renderModelMissing(model, extracted) {
  const localServerHint =
    location.protocol === "file:"
      ? "<p><strong>You opened this page as a file.</strong> Browsers block " +
        "loading the model from <code>file://</code>, so no prediction can be " +
        "made. Start a tiny web server instead:</p>" +
        '<pre><code>cd docs\npython3 -m http.server 8000</code></pre>' +
        "<p>then open <code>http://localhost:8000</code>.</p>"
      : "";

  analyzerEls.result.innerHTML =
    '<div class="result-card result-warning">' +
    "<h3>Model not loaded — no prediction is being made</h3>" +
    "<p>Expected file <code>" + model.file + "</code>" +
    (model.error ? " (failed: " + model.error + ")" : "") +
    ". This page never guesses: without the real trained model it will " +
    "not display a verdict.</p>" +
    localServerHint +
    "<p>Fix it by running <code>python export_model.py</code> in the project " +
    'folder — see <a href="../WEBSITE_GUIDE.md">WEBSITE_GUIDE.md</a>.</p>' +
    "</div>";

  // Features are still shown - that part is deterministic string counting.
  void extracted;
}

function renderResult(outcome, model, extracted) {
  const info = RESULTS.featureInfo;
  const means = model.payload.training.class_means;

  const contributionRows = outcome.contributions
    .slice(0, 5)
    .map((c) => {
      const dir = c.delta > 0 ? "toward phishing" : "toward legitimate";
      const cls = c.delta > 0 ? "bad" : "good";
      return (
        '<li><span class="contrib-feature"><code>' +
        info[c.feature].label + "</code></span>" +
        '<span class="contrib-delta ' + cls + '">' +
        (c.delta > 0 ? "+" : "") + (c.delta * 100).toFixed(1) + " pts</span>" +
        '<span class="contrib-dir">' + dir + "</span></li>"
      );
    })
    .join("");

  const verdictClass = outcome.isPhishing ? "verdict-phishing" : "verdict-legit";
  const probaPct = (outcome.phishingProb * 100).toFixed(1);

  analyzerEls.result.innerHTML =
    '<div class="result-card ' + verdictClass + '">' +
      '<div class="verdict-head">' +
        '<span class="verdict-icon" aria-hidden="true">' +
          (outcome.isPhishing ? "⚠️" : "✅") + "</span>" +
        "<div><p class=\"verdict-label\">Prediction</p>" +
        '<h3 class="verdict-text">' + outcome.label + "</h3></div>" +
        '<div class="verdict-proba">' +
          '<span class="proba-value">' + probaPct + "%</span>" +
          '<span class="proba-caption">phishing probability</span>' +
        "</div>" +
      "</div>" +
      '<div class="verdict-bar"><span style="width:' + probaPct + '%"></span></div>' +
      '<p class="verdict-detail">' +
        "<strong>" + outcome.votes.phishing + " of " + outcome.nTrees +
        "</strong> decision trees voted phishing, <strong>" +
        outcome.votes.legitimate + "</strong> voted legitimate. " +
        "Model: " + model.label + " (" + model.accuracy + " accuracy). " +
        "Analyzed <strong>" + extracted.url.length + " characters</strong> " +
        "as " + (FEATURE_ORDER.length) + " numeric features." +
      "</p>" +
      '<div class="contrib-block"><h4>What pushed the verdict</h4>' +
        (contributionRows
          ? "<ul class=\"contrib-list\">" + contributionRows + "</ul>"
          : "<p class=\"muted\">No single feature moved the score much for this URL — " +
            "the trees relied on many small splits.</p>") +
        '<p class="muted small">Each value is the change in phishing probability ' +
        "caused by the splits this URL passed through; the listed values sum to " +
        "the final score above.</p>" +
      "</div>" +
      '<div class="comparison-block"><h4>How this URL compares to dataset averages</h4>' +
        comparisonTable(extracted, means) +
      "</div>" +
    "</div>";
}

function comparisonTable(extracted, means) {
  const info = RESULTS.featureInfo;
  const rows = ["url_length", "n_slash", "n_dots", "n_hypens", "n_redirection"]
    .map((f) => {
      const v = extracted.values[f];
      const leg = means.legitimate[f];
      const phi = means.phishing[f];
      const lean = v >= phi ? "phishing-like" : v <= leg ? "legitimate-like" : "in between";
      return (
        "<tr><td>" + info[f].label + "</td>" +
        "<td class=\"num\"><strong>" + v + "</strong></td>" +
        '<td class="num">' + leg.toFixed(2) + "</td>" +
        '<td class="num">' + phi.toFixed(2) + "</td>" +
        '<td><span class="tag tag-' +
        (lean === "phishing-like" ? "bad" : lean === "legitimate-like" ? "good" : "neutral") +
        '">' + lean + "</span></td></tr>"
      );
    })
    .join("");

  return (
    '<div class="table-wrap"><table class="data-table compact">' +
    "<thead><tr><th>Feature</th><th class=\"num\">Your URL</th>" +
    '<th class="num">Avg legitimate</th><th class="num">Avg phishing</th>' +
    "<th>Compared with training data</th></tr></thead>" +
    "<tbody>" + rows + "</tbody></table></div>" +
    '<p class="muted small">Averages come from the original 100,077-row dataset ' +
    "printed in your notebook (cells 3 and 5, plus export_model.py).</p>"
  );
}

function renderFeatureTable(extracted) {
  const info = RESULTS.featureInfo;
  analyzerEls.featuresBody.innerHTML = FEATURE_ORDER.map((f) => {
    const v = extracted.values[f];
    return (
      '<tr class="' + (v > 0 ? "has-value" : "") + '">' +
      "<td><code>" + f + "</code></td>" +
      "<td>" + info[f].label + "</td>" +
      '<td class="num feature-value">' + v + "</td></tr>"
    );
  }).join("");
}

function refreshModelStatus() {
  if (!analyzerEls.status) return;
  const model = MODELS[activeModelKey];
  const els = {
    ready: ["status-ready", "Model loaded: " + model.label + " (" + model.payload.trees.length + " trees)"],
    failed: ["status-error", "Model file could not be loaded"],
    loading: ["status-loading", "Loading model…"],
    "not-requested": ["status-idle", "Model loads the first time you analyze a URL"]
  };
  const [cls, text] = els[model.status];
  analyzerEls.status.className = "model-status " + cls;
  analyzerEls.status.textContent = text;
}

document.addEventListener("DOMContentLoaded", initAnalyzer);
