// Global configuration and state
window.CFG = {
  // UPDATED: New Codes List
  CODES: [
    "CLEMENSBC","CLEMENSWC","MTPCORPWC","CORPBC","CORP15","CORPFMBC",
    "CORPFM15","CORP10","PFCORP10","PFCORPBC","IVYTECHBC","IVYTECH15",
    "CSCL","CSBC","LIPARI15","LIPARIBC"
  ],
  // 1. Local Main Data (Single Source)
  CSV: "./data/main.csv",
  
  // 2. Partners Data
  PARTNERS: "./data/partners.csv",
  
  // 3. Employers Data
  EMPLOYERS: "./data/employers.csv"
};

// Global State
window.ST = {
  data: [],
  filtered: [],
  months: [],
  loaded: false,
  partnersLoaded: false
};

// Utility functions
window.hasCode = function(n) {
  return window.CFG.CODES.some(c => (n || "").toUpperCase().includes(c));
};

window.normReg = function(v) {
  const s = (v || "").toUpperCase().trim();
  if (["CA","CAN","CANADA"].includes(s)) return "CAN";
  if (["US","USA","UNITED STATES"].includes(s)) return "US";
  return s;
};

window.monthKey = function(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
};

window.monthLbl = function(k) {
  const [y, m] = k.split("-");
  return new Date(y, m - 1).toLocaleString("default", { month: "short", year: "numeric" });
};

function setStatus(msg, type) {
  const s = document.getElementById("loadStatus");
  const i = document.getElementById("statusIndicator");
  if (s) s.textContent = msg;
  if (i) {
    i.className = "status-indicator";
    if (type === "success") { i.classList.add("success"); s.style.color = "var(--accent)"; }
    else if (type === "error") { i.classList.add("error"); s.style.color = "var(--error)"; }
  }
}

// Theme palette
window.pal = function() {
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
};

// Chart layout builder
window.lay = function(y, x) {
  const p = window.pal();
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
};

window.pcfg = { displayModeBar: false, responsive: true, autosizable: true };

// Main data loading function
async function loadData() {
  setStatus("Loading data...", "info");

  try {
    Papa.parse(window.CFG.CSV, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: result => {
        try {
          const data = result.data || [];

          // 1. Clean & Normalize
          const processed = data.map(row => {
            const o = {};
            for (const k in row) o[k.trim().toLowerCase()] = row[k];

            const ds = (o["created date"] || "").trim();
            
            // Robust Date Parsing
            let dateParsed = new Date(ds);
            
            if (isNaN(dateParsed) || ds.includes("-") || ds.includes("/")) {
                const parts = ds.split(/[\/\-\.]/); 
                if (parts.length === 3) {
                  let m = parseInt(parts[0], 10);
                  let d = parseInt(parts[1], 10);
                  let y = parseInt(parts[2], 10);
                  
                  // Handle 2-digit years
                  if (y < 100) y += 2000; 
                  dateParsed = new Date(y, m - 1, d);
                }
            }
            o.dateParsed = dateParsed;
            return o;
          });

          // 2. Pre-filter by Promo Code
          window.ST.data = processed.filter(r => window.hasCode(r["promotion name"]));
          
          // 3. Trigger Dashboard Setup
          if (typeof window.setupGlobalYear === "function") {
            window.setupGlobalYear();
            window.updateDashboard(); 
          } else {
              // Fallback for older main.js versions
              window.ST.filtered = [...window.ST.data];
              if(typeof renderCurrent === 'function') renderCurrent(window.ST.filtered);
              if(typeof setupClub === 'function') setupClub(window.ST.filtered);
              if(typeof renderTopClubs === 'function') renderTopClubs();
          }

          window.ST.loaded = true;

          // 4. Update Status
          setStatus(`${window.ST.data.length} records loaded`, "success");

          const validDates = window.ST.data.map(r => r.dateParsed).filter(d => !isNaN(d));
          if (validDates.length > 0) {
            const latest = new Date(Math.max(...validDates));
            const lu = document.getElementById("lastUpdated");
            const lut = document.getElementById("lastUpdatedText");
            if(lu) lu.style.display = "flex";
            if(lut) lut.textContent = "Data through: " + latest.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
          }

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
    console.error("Data Load Error:", e);
    setStatus("Failed to load data", "error");
  }
}

// Expose loadData so init can call it
window.loadData = loadData;