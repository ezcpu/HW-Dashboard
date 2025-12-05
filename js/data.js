// Global configuration and state
const CFG = { // or whatever your variable name is
  CODES: [
    "CLEMENSBC","CLEMENSWC","MTPCORPWC","CORPBC","CORP15","CORPFMBC",
    "CORPFM15","CORP10","PFCORP10","PFCORPBC"
  ],

  // Point to the local file instead of Google
  CSV: "./data/main.csv",

  // Point to the local file
  PARTNERS: "./data/partners.csv",

  EMPLOYER: [
    {
      company: "Pansophia",
      groupKey: "Pansophia",
      // Point to local file
      url: "./data/pansophia.csv",
      target: "kpiPansophia"
    },
    {
      company: "ASAMA Coldwater Manufacturing",
      groupKey: "ASAMABC",
      // Point to local file
      url: "./data/asama.csv",
      target: "kpiAsama"
    }
  ]
};

// Global State
const ST = {
  data: [],
  filtered: [],
  months: [],
  loaded: false,
  partnersLoaded: false
};

// Utility functions
function hasCode(n) {
  return CFG.CODES.some(c => (n || "").toUpperCase().includes(c));
}

function normReg(v) {
  const s = (v || "").toUpperCase().trim();
  if (["CA","CAN","CANADA"].includes(s)) return "CAN";
  if (["US","USA","UNITED STATES"].includes(s)) return "US";
  return s;
}

function monthKey(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function monthLbl(k) {
  const [y, m] = k.split("-");
  return new Date(y, m - 1).toLocaleString("default", { month: "short", year: "numeric" });
}

function setStatus(msg, type) {
  const s = document.getElementById("loadStatus");
  const i = document.getElementById("statusIndicator");
  s.textContent = msg;
  i.className = "status-indicator";
  if (type === "success") { i.classList.add("success"); s.style.color = "var(--accent)"; }
  else if (type === "error") { i.classList.add("error"); s.style.color = "var(--error)"; }
}

// Theme palette - Now reads dynamically from CSS variables
function pal() {
  const s = getComputedStyle(document.body);
  const get = (v) => s.getPropertyValue(v).trim();
  
  return {
    paper: get('--card'),
    plot: get('--card'),
    grid: get('--border'),
    font: get('--text-muted'),
    us: get('--primary'),
    can: get('--secondary'),
    accent: get('--accent')
  };
}

// Chart layout builder - Enhanced for cleaner look
function lay(y, x) {
  const p = pal();
  const s = getComputedStyle(document.body);
  const fontFam = s.getPropertyValue('font-family').trim().replace(/"/g, "'") || "'Plus Jakarta Sans', sans-serif";
  const textColor = s.getPropertyValue('--text').trim();

  return {
    margin: { t: 30, b: 40, l: 60, r: 20 },
    paper_bgcolor: p.paper,
    plot_bgcolor: p.plot,
    font: { color: p.font, family: fontFam, size: 11 },
    xaxis: { title: x, gridcolor: p.grid, zerolinecolor: p.grid, showgrid: false, automargin: true },
    yaxis: { title: y, gridcolor: p.grid, zerolinecolor: p.grid, automargin: true },
    legend: { orientation: "h", y: 1.15, x: 0, bgcolor: "rgba(0,0,0,0)", font: { size: 12, color: textColor } },
    hovermode: "closest",
    autosize: true
  };
}

const pcfg = { displayModeBar: false, responsive: true, autosizable: true };

// Main data loading function
async function loadData() {
  try {
    setStatus("Loading data...", "info");

    Papa.parse(CFG.CSV, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: result => {
        try {
          const data = result.data || [];

          // Clean & normalize
          const processed = data.map(row => {
            const o = {};
            for (const k in row) o[k.trim().toLowerCase()] = row[k];

            const ds = (o["created date"] || "").trim();
            o.dateParsed = new Date(
              ds.includes("/")
                ? ds.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, "$3-$1-$2")
                : ds
            );
            return o;
          });

          ST.data = processed;
          ST.filtered = processed.filter(r => hasCode(r["promotion name"]));

          ST.months = [...new Set(ST.filtered.map(r => {
            const d = r.dateParsed;
            return isNaN(d) ? null : monthKey(d);
          }).filter(Boolean))].sort();

          ST.loaded = true;

          renderCurrent(ST.filtered);
          setupClub(ST.filtered);
          renderTopClubs();

          const latest = new Date(
            Math.max(...ST.filtered.map(r => r.dateParsed).filter(d => !isNaN(d)))
          );

          document.getElementById("lastUpdated").style.display = "flex";
          document.getElementById("lastUpdatedText").textContent =
            "Data through: " +
            latest.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric"
            });

          setStatus(`${ST.filtered.length} records loaded`, "success");

        } catch (e) {
          console.error(e);
          setStatus("Failed to process data", "error");
        }
      },
      error: e => {
        console.error(e);
        setStatus("Failed to load data", "error");
      }
    });

  } catch (e) {
    console.error(e);
    setStatus("Failed to load data", "error");
  }
}
