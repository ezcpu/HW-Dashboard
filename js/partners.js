function renderPartners() {
  const listEl = document.getElementById("partnersList");
  if(!listEl) return;
  if(window.ST.partnersLoaded) return; // Charts persist, no re-render needed for Apex usually

  listEl.innerHTML = '<li style="justify-content:center; padding:20px; color:var(--text-muted)">Loading...</li>';
  
  Papa.parse(window.CFG.PARTNERS, {
    download: true, header: true, skipEmptyLines: true,
    complete: r => {
      const rows = r.data || [];
      const data = rows.map(raw => {
        const o = {};
        for (let k in raw) o[k.trim().toLowerCase()] = raw[k];
        const name = o["company name"] || o["company"] || "Unknown";
        let region = o["region"] || "Canada";
        region = region.replace(/canada/i, "Canada");
        const pay = o["payment arrangement"] || o["payment"] || "";
        const link = o["supporting documents (urls)"] || o["link"] || o["documents"] || "";
        return { name, region, pay, link };
      }).sort((a,b)=>a.name.localeCompare(b.name));

      window.ST.partnersData = data;
      window.ST.partnersLoaded = true;

      if (!data.length) {
         listEl.innerHTML = '<li style="justify-content:center; padding:20px;">No partners found</li>';
         return;
      }

      listEl.innerHTML = data.map(p => `
        <li>
          <span class="badge ${p.region==="Canada"?"can":"us"}">${p.region}</span>
          <span style="font-weight:600">${p.name}</span>
          <span>
            ${p.pay ? `<span class="badge payment">${p.pay}</span>` : ""}
            ${p.link ? `<a href="${p.link}" target="_blank" style="text-decoration:none; font-size:16px;" title="View Document">🗎</a>` : ""}
          </span>
        </li>
      `).join("");

      // Charts
      const p = window.pal();
      const cmn = window.apexCommon();
      
      const pReg = {}; data.forEach(item => pReg[item.region] = (pReg[item.region]||0)+1);
      new ApexCharts(document.getElementById("partnersByRegion"), {
        ...cmn,
        chart: { type: 'donut', height: 280, background:'transparent' },
        series: Object.values(pReg),
        labels: Object.keys(pReg),
        colors: [p.us, p.can, p.accent],
        legend: { show: true, position: 'bottom' }
      }).render();

      const pPay = {}; data.forEach(item => { if(item.pay) pPay[item.pay]=(pPay[item.pay]||0)+1; });
      new ApexCharts(document.getElementById("paymentByRegion"), {
        ...cmn,
        chart: { type: 'donut', height: 280, background:'transparent' },
        series: Object.values(pPay),
        labels: Object.keys(pPay),
        colors: ['#64748b', '#94a3b8', '#cbd5e1'],
        legend: { show: true, position: 'bottom' }
      }).render();
    },
    error: () => listEl.innerHTML = '<li style="color:var(--error)">Failed to load</li>'
  });
}