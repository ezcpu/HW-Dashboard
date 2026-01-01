async function fetchCSV(url) {
  return new Promise(resolve => {
    Papa.parse(url, { download:true, header:true, skipEmptyLines:true, complete:resolve, error:()=>resolve({data:[], meta:{fields:[]}}) });
  });
}

async function renderEmployer() {
  const con = document.getElementById("employerList");
  if(!con) return;
  con.innerHTML = '<tr><td colspan="2" class="loading-cell">Processing...</td></tr>';

  try {
    const [gen, uaw] = await Promise.all([
      fetchCSV(window.CFG.EMPLOYERS),
      fetchCSV(window.CFG.UAW_FORD)
    ]);

    const stats = {};
    
    // --- 1. PROCESS GENERIC EMPLOYERS ---
    const normalize = (rows) => rows.map(r => {
      const o = {};
      for (let k in r) o[k.trim().toLowerCase()] = r[k];
      return o;
    });

    const processGeneric = (rows, grpTerms, clubTerms) => {
      const normRows = normalize(rows);
      if(!normRows.length) return;
      const keys = Object.keys(normRows[0]);
      const gKey = grpTerms ? keys.find(k => grpTerms.some(t => k.includes(t))) : null;
      const cKey = keys.find(k => clubTerms.some(t => k.includes(t))) || keys[0];

      normRows.forEach(r => {
        const g = (gKey ? (r[gKey]||"").trim() : "Unknown");
        const c = (cKey ? (r[cKey]||"Unknown").trim() : "Unknown");
        if(g && g !== "Unknown") {
          if(!stats[g]) stats[g] = { total:0, clubs:{} };
          stats[g].total++;
          stats[g].clubs[c] = (stats[g].clubs[c]||0)+1;
        }
      });
    };

    processGeneric(gen.data, ['group', 'company', 'employer'], ['club', 'location']);

    // --- 2. PROCESS UAW FORD (Restored Logic) ---
    // Logic: Active if Date in Column J (Index 9) is less than 12 months old
    if (uaw.data && uaw.data.length > 0) {
      const headers = uaw.meta.fields || [];
      const dateCol = headers[9]; // Column J
      // Fallback for club column search
      const clubCol = headers.find(h => h.toLowerCase().includes("club") || h.toLowerCase().includes("location")) || headers[0];
      
      const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
      const now = new Date();
      const groupName = "UAW Ford";

      uaw.data.forEach(row => {
        const dateStr = (row[dateCol] || "").trim();
        const clubName = (row[clubCol] || "Unknown Club").trim();

        // Robust Date Parsing
        const d = new Date(dateStr);
        
        // Active Check
        if (!isNaN(d) && (now - d) < ONE_YEAR_MS) {
           if (!stats[groupName]) stats[groupName] = { total: 0, clubs: {} };
           
           stats[groupName].total++;
           stats[groupName].clubs[clubName] = (stats[groupName].clubs[clubName] || 0) + 1;
        }
      });
    }

    // --- 3. RENDER ---
    const sorted = Object.entries(stats).sort((a,b)=>b[1].total - a[1].total);
    
    if(!sorted.length) { 
      con.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:20px;color:var(--text-muted)">No Data Found</td></tr>'; 
      return; 
    }

    con.innerHTML = sorted.map(([k,v]) => {
      const clubs = Object.entries(v.clubs).sort((a,b)=>b[1]-a[1]).map(([cn,cc]) => 
        `<tr><td style="padding-left:24px; color:var(--text-muted); font-size:13px">• ${cn}</td><td style="text-align:right; color:var(--text-muted); font-size:13px">${cc}</td></tr>`
      ).join("");
      return `<tr style="background:rgba(255,255,255,0.05)"><td style="font-weight:700">${k}</td><td style="text-align:right; font-weight:700">${v.total}</td></tr>` + clubs;
    }).join("");

  } catch(e) { 
    console.error(e);
    con.innerHTML = '<tr><td colspan="2" style="color:var(--error); text-align:center">Error loading data</td></tr>'; 
  }
}