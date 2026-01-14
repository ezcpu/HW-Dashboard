window.CFG = {
  CODES: ["CLEMENSBC","CLEMENSWC","MTPCORPWC","CORPBC","CORP15","CORPFM15","CORPFMBC","CORP10","PFCORP10","PFCORPBC","IVYTECHBC","IVYTECH15","CSCL","CSBC","LIPARI15","LIPARIBC"],
  CSV: "./data/main.csv",
  PARTNERS: "./data/partners.csv",
  EMPLOYERS: "./data/employers.csv",
  UAW_FORD: "./data/uaw_ford.csv"
};

window.ST = { data: [], filtered: [], months: [], loaded: false, partnersLoaded: false, partnersData: [] };

// Security: HTML escaping to prevent XSS
window.escapeHtml = function(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// Security: Validate URLs to prevent javascript: protocol injection
window.isSafeUrl = function(url) {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
};

window.hasCode = function(n) { return window.CFG.CODES.some(c => (n || "").toUpperCase().includes(c)); };
window.normReg = function(v) {
  const s = (v || "").toUpperCase().trim();
  if (["CA","CAN","CANADA"].includes(s)) return "CAN";
  if (["US","USA","UNITED STATES"].includes(s)) return "US";
  return s;
};
window.monthKey = function(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
window.monthLbl = function(k) { const [y, m] = k.split("-"); return new Date(y, m - 1).toLocaleString("default", { month: "short", year: "numeric" }); };

function setStatus(msg, type) {
  const s = document.getElementById("loadStatus");
  const i = document.getElementById("statusIndicator");
  if (s) s.textContent = msg;
  if (i) {
    i.className = "status-indicator";
    if (type === "success") i.classList.add("success");
    else if (type === "error") i.classList.add("error");
  }
}

// DYNAMIC PALETTE
window.pal = function() {
  const s = getComputedStyle(document.body);
  const get = (v) => s.getPropertyValue(v).trim();
  return {
    text: get('--text'),       
    textMuted: get('--text-muted'),  
    us: '#4f46e5',         // Indigo
    can: '#0ea5e9',        // Sky
    accent: '#10b981',     // Emerald
    bg: 'transparent'
  };
};

// APEXCHARTS CONFIG
window.apexCommon = function() {
  const p = window.pal();
  return {
    chart: {
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: true, easing: 'easeinout', speed: 1000 }
    },
    dataLabels: { enabled: false },
    stroke: { show: false, curve: 'smooth', width: 2 }, 
    grid: { 
      borderColor: 'rgba(128,128,128,0.1)', 
      strokeDashArray: 4 
    },
    legend: { 
      show: false,
      labels: { colors: p.text } // FORCE LEGEND TEXT TO MAIN COLOR
    }, 
    xaxis: { 
      labels: { 
        style: { 
          colors: p.text, // FORCE AXIS TEXT TO MAIN COLOR
          fontFamily: 'Plus Jakarta Sans, sans-serif', 
          fontWeight: 600,
          fontSize: '11px'
        } 
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: { 
      labels: { 
        style: { 
          colors: p.text, // FORCE AXIS TEXT TO MAIN COLOR
          fontFamily: 'Plus Jakarta Sans, sans-serif', 
          fontWeight: 600 
        } 
      } 
    },
    tooltip: { 
      theme: document.body.classList.contains('dark') ? 'dark' : 'light',
      style: { fontSize: '12px' }
    }
  };
};

window.loadData = function() {
  setStatus("Loading data...", "info");
  
  Papa.parse(window.CFG.CSV, {
    download: true, header: true, skipEmptyLines: true,
    complete: result => {
      try {
        const data = result.data || [];
        const processed = data.map(row => {
          const o = {};
          for (const k in row) o[k.trim().toLowerCase()] = row[k];
          let ds = (o["created date"] || "").trim();
          let dateParsed = new Date(ds);

          // Only attempt manual parsing if native parsing failed
          if (isNaN(dateParsed.getTime())) {
             const parts = ds.split(/[\/\-\.]/);
             if (parts.length === 3) {
               let p1 = parseInt(parts[0], 10), p2 = parseInt(parts[1], 10), p3 = parseInt(parts[2], 10);

               // Detect format based on value ranges
               if (p3 > 1000) {
                 // Format: MM/DD/YYYY or DD/MM/YYYY with year at end
                 dateParsed = new Date(p3, p1 - 1, p2);
               } else if (p1 > 1000) {
                 // Format: YYYY/MM/DD or YYYY/DD/MM
                 dateParsed = new Date(p1, p2 - 1, p3);
               } else if (p3 < 100) {
                 // Format: MM/DD/YY - assume 2000s for 2-digit years
                 const year = p3 < 50 ? 2000 + p3 : 1900 + p3;
                 dateParsed = new Date(year, p1 - 1, p2);
               }
             }
          }
          o.dateParsed = dateParsed;
          return o;
        });

        // Filter valid promo codes
        window.ST.data = processed.filter(r => window.hasCode(r["promotion name"]));
        
        window.ST.loaded = true;
        
        setStatus("System Ready", "success");
        
        if (typeof window.setupGlobalYear === "function") {
          window.setupGlobalYear();
          window.updateDashboard(); 
        }

        const dates = window.ST.data.map(r => r.dateParsed).filter(d => d instanceof Date && !isNaN(d.getTime()));
        if (dates.length) {
           const latest = new Date(Math.max.apply(null, dates.map(d => d.getTime())));
           const lu = document.getElementById("lastUpdated");
           const lut = document.getElementById("lastUpdatedText");
           if(lu) lu.style.display = "block";
           if(lut) lut.textContent = "Data: " + latest.toLocaleDateString();
        }
      } catch (e) { console.error("Data processing error:", e); setStatus("Data Error", "error"); }
    },
    error: (e) => { console.error("CSV load error:", e); setStatus("Load Failed", "error"); }
  });
};