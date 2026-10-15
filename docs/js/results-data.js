/* =====================================================================
   results-data.js
   ---------------------------------------------------------------------
   EVERY number in this file was copied directly from the executed cell
   outputs of Phishing_Website_Analysis.ipynb, or computed from them by
   export_model.py using the exact same pipeline (verified to reproduce
   Decision Tree 81.41% and Random Forest 82.58%).

   Nothing here is estimated, rounded up, or invented.
   ===================================================================== */

const RESULTS = {

  /* ---------- Dataset overview (notebook cells 1, 6, 7, 8) ---------- */
  dataset: {
    name: "Web Page Phishing Dataset",
    source: "https://www.kaggle.com/datasets/danielfernandon/web-page-phishing-dataset",
    originalRows: 100077,
    columns: 20,              // 19 URL features + 1 label
    features: 19,
    missingValues: 0,
    duplicateRows: 78186,
    conflictingLabels: 1913,  // feature combinations seen with both labels
    cleanedRows: 21891,
    cleanedLegit: 6019,
    cleanedPhishing: 15872,
    originalLegit: 63715,     // cell 2
    originalPhishing: 36362,  // cell 2
    trainRows: 17523,
    testRows: 4368,
    testLegit: 1143,          // classification report support
    testPhishing: 3225,       // classification report support
    trainPhishingShare: 0.721737,
    testPhishingShare: 0.738324,   // "always say phishing" baseline = 73.83%
    sharedFeatureGroups: 0          // leakage check (cell 8)
  },

  /* ---------- Per-class URL averages (notebook cells 3 and 5) ------- */
  averages: {
    urlLength: { legit: 23.589971, phishing: 66.491117 },
    slashes:   { legit: 0.290732,  phishing: 2.615423 }
  },

  /* ---------- Models (notebook cell 9) ------------------------------ */
  models: {
    decisionTree: {
      key: "decisionTree",
      label: "Decision Tree",
      accuracyRaw: 0.8141025641025641,
      accuracyPct: "81.41%",
      params: "max_depth=10, random_state=42",
      // classification_report (cell 10)
      legit:     { precision: 0.66, recall: 0.60, f1: 0.63, support: 1143 },
      phishing:  { precision: 0.86, recall: 0.89, f1: 0.88, support: 3225 },
      macroAvg:      { precision: 0.76, recall: 0.74, f1: 0.75 },
      weightedAvg:   { precision: 0.81, recall: 0.81, f1: 0.81 },
      // confusion_matrix(y_test, predictions) - computed by export_model.py
      // from the identical retrained model: rows = actual, cols = predicted
      confusion: { tn: 682, fp: 461, fn: 351, tp: 2874 }
    },
    randomForest: {
      key: "randomForest",
      label: "Random Forest",
      accuracyRaw: 0.8257783882783882,
      accuracyPct: "82.58%",
      params: "n_estimators=100, max_depth=10, random_state=42",
      legit:     { precision: 0.75, recall: 0.50, f1: 0.60, support: 1143 },
      phishing:  { precision: 0.84, recall: 0.94, f1: 0.89, support: 3225 },
      macroAvg:      { precision: 0.80, recall: 0.72, f1: 0.74 },
      weightedAvg:   { precision: 0.82, recall: 0.83, f1: 0.81 },
      confusion: { tn: 573, fp: 570, fn: 191, tp: 3034 }
    }
  },

  /* ---------- Correlation with the phishing label (cell 4) ---------- */
  correlations: [
    { feature: "n_slash",        value:  0.611472 },
    { feature: "url_length",     value:  0.430125 },
    { feature: "n_equal",        value:  0.260462 },
    { feature: "n_and",          value:  0.189173 },
    { feature: "n_dots",         value:  0.181884 },
    { feature: "n_underline",    value:  0.168305 },
    { feature: "n_questionmark", value:  0.167045 },
    { feature: "n_hypens",       value:  0.150413 },
    { feature: "n_at",           value:  0.109056 },
    { feature: "n_redirection",  value: -0.050822 },
    { feature: "n_tilde",        value:  0.049616 },
    { feature: "n_exclamation",  value:  0.029358 },
    { feature: "n_comma",        value:  0.026512 },
    { feature: "n_percent",      value:  0.026117 },
    { feature: "n_dollar",       value:  0.025799 },
    { feature: "n_asterisk",     value:  0.019092 },
    { feature: "n_space",        value:  0.014757 },
    { feature: "n_hastag",       value:  0.010257 },
    { feature: "n_plus",         value:  0.006619 }
  ],

  /* ---------- Random Forest feature importance (cell 11) ------------ */
  importances: [
    { feature: "n_slash",        value: 0.305447 },
    { feature: "url_length",     value: 0.194067 },
    { feature: "n_hypens",       value: 0.135803 },
    { feature: "n_equal",        value: 0.090770 },
    { feature: "n_dots",         value: 0.073022 },
    { feature: "n_redirection",  value: 0.046566 },
    { feature: "n_underline",    value: 0.034610 },
    { feature: "n_and",          value: 0.031203 },
    { feature: "n_at",           value: 0.028720 },
    { feature: "n_questionmark", value: 0.020320 },
    { feature: "n_percent",      value: 0.018907 },
    { feature: "n_plus",         value: 0.007483 },
    { feature: "n_space",        value: 0.004044 },
    { feature: "n_tilde",        value: 0.003043 },
    { feature: "n_exclamation",  value: 0.002912 },
    { feature: "n_comma",        value: 0.001631 },
    { feature: "n_asterisk",     value: 0.001127 },
    { feature: "n_dollar",       value: 0.000304 },
    { feature: "n_hastag",       value: 0.000020 }
  ],

  /* ---------- Plain-English meanings of the 19 features ------------- */
  featureInfo: {
    url_length:     { label: "URL length",          desc: "Total number of characters in the URL." },
    n_dots:         { label: "Dots",                desc: "Number of '.' characters (subdomains add dots)." },
    n_hypens:       { label: "Hyphens",             desc: "Number of '-' characters. (Dataset spelling kept: n_hypens)" },
    n_underline:    { label: "Underlines",          desc: "Number of '_' characters." },
    n_slash:        { label: "Slashes",             desc: "Number of '/' characters, not counting the two inside '://'." },
    n_questionmark: { label: "Question marks",      desc: "Number of '?' characters (start of a query string)." },
    n_equal:        { label: "Equal signs",         desc: "Number of '=' characters (query parameters)." },
    n_at:           { label: "At signs",            desc: "Number of '@' characters (used to hide the real host)." },
    n_and:          { label: "Ampersands",          desc: "Number of '&' characters joining query parameters." },
    n_exclamation:  { label: "Exclamation marks",   desc: "Number of '!' characters." },
    n_space:        { label: "Spaces",              desc: "Number of space characters (rare in normal URLs)." },
    n_tilde:        { label: "Tildes",              desc: "Number of '~' characters." },
    n_comma:        { label: "Commas",              desc: "Number of ',' characters." },
    n_plus:         { label: "Pluses",              desc: "Number of '+' characters (spaces in query strings)." },
    n_asterisk:     { label: "Asterisks",           desc: "Number of '*' characters." },
    n_hastag:       { label: "Hash marks",          desc: "Number of '#' characters (fragment). (Dataset spelling kept: n_hastag)" },
    n_dollar:       { label: "Dollar signs",        desc: "Number of '$' characters." },
    n_percent:      { label: "Percent signs",       desc: "Number of '%' characters (encoded characters)." },
    n_redirection:  { label: "Redirections",        desc: "How many '://' markers the URL contains, minus one. -1 means the URL has no '://' at all." }
  },

  /* ---------- Original chart images exported from the notebook ------ */
  notebookImages: [
    { src: "assets/class-distribution.png",        title: "Distribution of Legitimate and Phishing Websites", cell: "Cell 2" },
    { src: "assets/avg-url-length.png",            title: "Average URL Length by Website Type",               cell: "Cell 3" },
    { src: "assets/feature-correlation.png",       title: "Correlation Between URL Features and Phishing",    cell: "Cell 4" },
    { src: "assets/avg-slashes.png",               title: "Average Number of Slashes by Website Type",        cell: "Cell 5" },
    { src: "assets/confusion-matrix-decision-tree.png",  title: "Decision Tree Confusion Matrix",             cell: "Cell 10" },
    { src: "assets/confusion-matrix-random-forest.png",  title: "Random Forest Confusion Matrix",             cell: "Cell 10" },
    { src: "assets/feature-importance.png",        title: "Top 10 Features for Phishing Detection",           cell: "Cell 11" }
  ]
};

/* Feature order must match X_train.columns exactly - the analyzer relies
   on this array to build the input vector in training order. */
const FEATURE_ORDER = [
  "url_length", "n_dots", "n_hypens", "n_underline", "n_slash",
  "n_questionmark", "n_equal", "n_at", "n_and", "n_exclamation",
  "n_space", "n_tilde", "n_comma", "n_plus", "n_asterisk",
  "n_hastag", "n_dollar", "n_percent", "n_redirection"
];
