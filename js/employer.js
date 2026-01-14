// Helper for Accordion Behavior (Single Expand)
window.toggleEmpCard = function(el) {
  // 1. Close all OTHER cards
  const all = document.querySelectorAll('.employer-card');
  all.forEach(card => {
    if (card !== el) {
      card.classList.remove('expanded');
    }
  });

  // 2. Toggle the CURRENT card
  el.classList.toggle('expanded');
};

async function fetchCSV(url) {
  return new Promise(resolve => {
    Papa.parse(url, { download:true, header:true, skipEmptyLines:true, complete:resolve, error:()=>resolve({data:[], meta:{fields:[]}}) });
  });
}

async function renderEmployer() {
  const con = document.getElementById("employerGrid"); 
  if(!con) return;
  con.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-muted);">Processing...</div>';

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

    // --- 2. PROCESS UAW FORD ---
    if (uaw.data && uaw.data.length > 0) {
      const headers = uaw.meta.fields || [];
      const dateCol = headers[9]; // Column J
      const clubCol = headers.find(h => h.toLowerCase().includes("club") || h.toLowerCase().includes("location")) || headers[0];
      
      const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
      const now = new Date();
      const groupName = "UAW Ford";

      uaw.data.forEach(row => {
        const dateStr = (row[dateCol] || "").trim();
        const clubName = (row[clubCol] || "Unknown Club").trim();
        const d = new Date(dateStr);
        
        if (!isNaN(d) && (now - d) < ONE_YEAR_MS) {
           if (!stats[groupName]) stats[groupName] = { total: 0, clubs: {} };
           stats[groupName].total++;
           stats[groupName].clubs[clubName] = (stats[groupName].clubs[clubName] || 0) + 1;
        }
      });
    }

    // --- 3. CALCULATE GRAND TOTAL ---
    let grandTotal = 0;
    Object.values(stats).forEach(v => grandTotal += v.total);

    // Update Header Text with Total
    const headerEl = document.querySelector("#employerPaid .panel-header");
    if(headerEl) {
      headerEl.textContent = `Employer-Sponsored Programs (Total: ${grandTotal.toLocaleString()})`;
    }

    // --- 4. RENDER CARDS ---
    const sorted = Object.entries(stats).sort((a,b)=>b[1].total - a[1].total);
    
    if(!sorted.length) { 
      con.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-muted);">No Data Found</div>'; 
      return; 
    }

    con.innerHTML = sorted.map(([k,v]) => {
      const clubList = Object.entries(v.clubs)
        .sort((a,b)=>b[1]-a[1])
        .map(([cn,cc]) => `
          <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; color:var(--text-muted);">
            <span>• ${cn}</span>
            <span>${cc}</span>
          </div>
        `).join("");

      return `
        <div class="employer-card" onclick="window.toggleEmpCard(this)">
          <div class="emp-header">
             <span class="emp-name">${k}</span>
             <span class="emp-count">${v.total}</span>
          </div>
          <div class="emp-details">
             <div style="font-size:11px; font-weight:700; text-transform:uppercase; margin-bottom:8px; color:var(--text-light);">Club Breakdown</div>
             ${clubList}
          </div>
        </div>
      `;
    }).join("");

  } catch(e) { 
    console.error(e);
    con.innerHTML = '<div style="grid-column: 1/-1; color:var(--error); text-align:center">Error loading data</div>'; 
  }
}