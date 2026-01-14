function renderPartners() {
  const listIds = ['listWest', 'listCan', 'listEast'];
  
  // 1. Clear existing content to prepare for render
  listIds.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.innerHTML = '';
  });

  // 2. Define the Rendering Logic (Reusable)
  const buildPartnersUI = (data) => {
    // Fill Directory Lists
    data.forEach(p => {
        // Validate URL to prevent XSS via javascript: protocol
        const safeLink = (p.link && window.isSafeUrl(p.link)) ? p.link : null;

        const itemHtml = `
          <li>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <span style="font-weight:600; font-size:14px; color:var(--text)">${window.escapeHtml(p.name)}</span>
              ${p.pay ? `<span class="badge payment" style="width:fit-content">${window.escapeHtml(p.pay)}</span>` : ""}
            </div>
            ${safeLink ? `<a href="${window.escapeHtml(safeLink)}" target="_blank" rel="noopener noreferrer" class="btn-flyer">View Flyer <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>` : ""}
          </li>
        `;

        if (p.regLower.includes("can")) {
           const el = document.getElementById("listCan");
           if(el) el.innerHTML += itemHtml;
        } else if (p.regLower.includes("west") || p.regLower.includes("ca") || p.regLower.includes("wa") || p.regLower.includes("or")) {
           const el = document.getElementById("listWest");
           if(el) el.innerHTML += itemHtml;
        } else {
           const el = document.getElementById("listEast");
           if(el) el.innerHTML += itemHtml;
        }
    });

    // Render Charts (Using global renderApex to prevent duplicates)
    if (typeof window.renderApex === 'function') {
      const p = window.pal();
      const cmn = window.apexCommon();
      
      // Geography Chart
      const pReg = {}; data.forEach(item => pReg[item.region] = (pReg[item.region]||0)+1);
      window.renderApex("partnersByRegion", {
        ...cmn,
        chart: { type: 'donut', height: 280, background:'transparent' },
        series: Object.values(pReg),
        labels: Object.keys(pReg),
        colors: [p.us, p.can, p.accent], 
        stroke: { width: 0 },
        dataLabels: {
          enabled: true,
          formatter: function (val, opts) { return opts.w.config.series[opts.seriesIndex]; },
          style: { fontSize: '12px', fontWeight: 700 }
        },
        legend: { show: true, position: 'bottom', labels: { colors: p.text } }
      });

      // Payment Chart
      const pPay = {}; data.forEach(item => { if(item.pay) pPay[item.pay]=(pPay[item.pay]||0)+1; });
      window.renderApex("paymentByRegion", {
        ...cmn,
        chart: { type: 'donut', height: 280, background:'transparent' },
        series: Object.values(pPay),
        labels: Object.keys(pPay),
        colors: ['#3b82f6', '#64748b', '#94a3b8', '#cbd5e1'], 
        stroke: { width: 0 },
        dataLabels: {
          enabled: true,
          formatter: function (val, opts) { return opts.w.config.series[opts.seriesIndex]; },
          style: { fontSize: '12px', fontWeight: 700 }
        },
        legend: { show: true, position: 'bottom', labels: { colors: p.text } }
      });
    }
  };

  // 3. Check if Data is Already Loaded
  if(window.ST.partnersLoaded && window.ST.partnersData.length > 0) {
    // Data exists? Just build the UI.
    buildPartnersUI(window.ST.partnersData);
    return;
  }

  // 4. If Not Loaded, Show Loading Indicator & Fetch
  listIds.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.innerHTML = '<li style="justify-content:center; padding:20px; color:var(--text-muted)">Loading...</li>';
  });
  
  Papa.parse(window.CFG.PARTNERS, {
    download: true, header: true, skipEmptyLines: true,
    complete: r => {
      const rows = r.data || [];
      const data = rows.map(raw => {
        const o = {};
        for (let k in raw) o[k.trim().toLowerCase()] = raw[k];
        const name = o["company name"] || o["company"] || "Unknown";
        let region = o["region"] || "Canada";
        const regLower = region.toLowerCase();
        
        const pay = o["payment arrangement"] || o["payment"] || "";
        const link = o["supporting documents (urls)"] || o["link"] || o["documents"] || "";
        return { name, region, regLower, pay, link };
      }).sort((a,b)=>a.name.localeCompare(b.name));

      // Store Data
      window.ST.partnersData = data;
      window.ST.partnersLoaded = true;

      // Clear Loading Indicators
      listIds.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = '';
      });

      if (!data.length) {
         listIds.forEach(id => {
           const el = document.getElementById(id);
           if (el) el.innerHTML = '<li style="justify-content:center; padding:20px;">No partners found</li>';
         });
         return;
      }

      // Build UI
      buildPartnersUI(data);
    },
    error: (error) => {
      console.error("Partner load error:", error);
      listIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<li style="color:var(--error)">Failed to load</li>';
      });
    }
  });
}