// GLOBAL CHART STORAGE
window.CHART_INSTANCES = {};

function destroyChart(id) {
  if (window.CHART_INSTANCES[id]) {
    window.CHART_INSTANCES[id].destroy();
    delete window.CHART_INSTANCES[id];
  }
}

function renderApex(id, options) {
  destroyChart(id);
  const el = document.getElementById(id);
  if (!el) return;
  const chart = new ApexCharts(el, options);
  chart.render();
  window.CHART_INSTANCES[id] = chart;
}

// --- OVERVIEW TAB RENDER ---
function renderCurrent(data) {
  const p = window.pal();
  const cmn = window.apexCommon();
  
  let total = 0, bcCount = 0, nrCount = 0;
  const tot = { US: 0, CAN: 0 };
  const bc = { US: 0, CAN: 0 };
  const nr = { US: 0, CAN: 0 };

  data.forEach(r => {
    const reg = window.normReg(r["region"]);
    const m = (r["membership type"] || "").toUpperCase();

    total++;
    if (reg in tot) tot[reg]++;
    if (m.includes("BLACK")) { bcCount++; if (reg in bc) bc[reg]++; }
    if (m.includes("10NR")) { nrCount++; if (reg in nr) nr[reg]++; }
  });

  updateVal("kpiTotal", total.toLocaleString());
  updateVal("kpiBC", bcCount.toLocaleString());
  updateVal("kpi10NR", nrCount.toLocaleString());
  updateVal("kpiRatio", total > 0 ? ((bcCount / total) * 100).toFixed(1) + "%" : "0.0%");

  const barOpts = (name, dataObj) => ({
    ...cmn,
    chart: { type: 'bar', height: 260, toolbar: { show: false }, background: 'transparent' },
    colors: [p.us, p.can],
    stroke: { show: false },
    plotOptions: { bar: { distributed: true, borderRadius: 6, columnWidth: '55%', dataLabels: { position: 'top' } } },
    dataLabels: { enabled: true, offsetY: -20, style: { fontSize: '12px', fontWeight: 800, colors: [p.text] } },
    series: [{ name: name, data: [dataObj.US, dataObj.CAN] }],
    xaxis: { categories: ['US', 'CAN'], labels: { style: { colors: [p.text, p.text], fontWeight: 700 } }, axisBorder: {show:false}, axisTicks: {show:false} },
    grid: { show: false }
  });

  renderApex("regionTotalChart", barOpts("Total", tot));
  renderApex("regionBCChart", barOpts("Black Card", bc));
  renderApex("region10NRChart", barOpts("10NR", nr));

  const mUS={}, mCAN={};
  data.forEach(r => {
    if(r.dateParsed instanceof Date && !isNaN(r.dateParsed.getTime())) {
      const reg = window.normReg(r["region"]);
      const k = window.monthKey(r.dateParsed);
      if(reg==="US") mUS[k] = (mUS[k]||0)+1;
      if(reg==="CAN") mCAN[k] = (mCAN[k]||0)+1;
    }
  });
  const kUS=Object.keys(mUS).sort(), kCAN=Object.keys(mCAN).sort();

  const trendOpts = (color, cats, vals) => ({
    ...cmn,
    chart: { type: 'area', height: 300, toolbar: { show: false }, background: 'transparent' },
    colors: [color],
    stroke: { curve: 'smooth', width: 3 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    dataLabels: { enabled: false },
    series: [{ name: "Signups", data: vals }],
    xaxis: { categories: cats, labels: { style: { colors: p.text } } }
  });

  renderApex("impactUS", trendOpts(p.us, kUS.map(window.monthLbl), kUS.map(k=>mUS[k])));
  renderApex("impactCAN", trendOpts(p.can, kCAN.map(window.monthLbl), kCAN.map(k=>mCAN[k])));

  const pReg = { US:{}, CAN:{} };
  data.forEach(r => {
    const pn = (r["promotion name"]||"").trim();
    if(pn) {
      const reg = window.normReg(r["region"]);
      if(reg in pReg) pReg[reg][pn] = (pReg[reg][pn]||0)+1;
    }
  });
  const allP = [...new Set([...Object.keys(pReg.US), ...Object.keys(pReg.CAN)])];
  const topP = allP.sort((a,b)=> ((pReg.US[b]||0)+(pReg.CAN[b]||0)) - ((pReg.US[a]||0)+(pReg.CAN[a]||0)) ).slice(0,5);

  if(topP.length) {
    renderApex("promoChart", {
      ...cmn,
      chart: { type: 'bar', height: 360, stacked: true, toolbar:{show:false}, background:'transparent' },
      colors: [p.us, p.can],
      stroke: { show: false },
      plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
      dataLabels: { enabled: true, style: { colors: ['#ffffff'], fontSize: '12px', fontWeight: 600 } },
      series: [
        { name: 'US', data: topP.map(n=>pReg.US[n]||0) },
        { name: 'CAN', data: topP.map(n=>pReg.CAN[n]||0) }
      ],
      xaxis: { categories: topP, labels: { style: { colors: p.text } } },
      legend: { show: true, position: 'top', labels: { colors: p.text } }
    });
  }
}

// --- CLUB INSIGHTS LOGIC ---

// 1. Build Month Dropdown (Checkboxes)
window.updateMonthDropdown = function() {
  const con = document.getElementById("monthDropdownList");
  if (!con) return;

  // Only build if empty
  if (con.innerHTML !== "") return;

  const months = window.ST.months || [];
  
  let html = `
    <label class="checkbox-item" style="font-weight:700; border-bottom:1px solid var(--glass-border); margin-bottom:4px; padding-bottom:8px;">
      <input type="checkbox" value="__ALL__" checked> All Months
    </label>
  `;
  
  months.forEach(m => {
    html += `<label class="checkbox-item"><input type="checkbox" value="${window.escapeHtml(m)}" checked> ${window.escapeHtml(window.monthLbl(m))}</label>`;
  });
  
  con.innerHTML = html;

  const boxes = Array.from(con.querySelectorAll("input"));
  const all = boxes[0];

  if(all) {
    all.addEventListener("change", e => {
      boxes.forEach(b => b.checked = e.target.checked);
      updateMonthButton();
      renderClub();
    });

    boxes.slice(1).forEach(b => b.addEventListener("change", () => {
      all.checked = boxes.slice(1).every(x => x.checked);
      updateMonthButton();
      renderClub();
    }));
  }

  updateMonthButton();
};

// 2. Update Month Button Text
window.updateMonthButton = function() {
  const con = document.getElementById("monthDropdownList");
  const btn = document.getElementById("monthDropdownBtn");
  if(!con || !btn) return;
  
  const boxes = Array.from(con.querySelectorAll("input:not([value='__ALL__'])"));
  const checked = boxes.filter(b=>b.checked);
  
  if (checked.length === boxes.length) {
    btn.textContent = "All Months";
  } else if (checked.length === 0) {
    btn.textContent = "Select Months";
  } else if (checked.length === 1) {
    const val = checked[0].value;
    btn.textContent = window.monthLbl(val);
  } else {
    btn.textContent = `${checked.length} Months Selected`;
  }
};

// 3. Setup Club Filter
window.setupClub = function(data) {
  const con = document.getElementById("clubDropdownList");
  if(!con) return;
  
  if (con.innerHTML === "") {
    const clubs = [...new Set(data.map(r=>(r["club name"]||"").trim()).filter(Boolean))].sort();
    
    let html = `
      <label class="checkbox-item" style="font-weight:700; border-bottom:1px solid var(--glass-border); margin-bottom:4px; padding-bottom:8px;">
        <input type="checkbox" value="__ALL__" checked> Select All
      </label>
    `;
    
    clubs.forEach(c => {
      html += `<label class="checkbox-item"><input type="checkbox" value="${window.escapeHtml(c)}" checked> ${window.escapeHtml(c)}</label>`;
    });
    con.innerHTML = html;

    const boxes = Array.from(con.querySelectorAll("input"));
    const all = boxes[0];

    if(all) {
      all.addEventListener("change", e => { 
        boxes.forEach(b => b.checked = e.target.checked); 
        updateClubButton(); 
        renderClub(); 
      });

      boxes.slice(1).forEach(b => b.addEventListener("change", () => {
        all.checked = boxes.slice(1).every(x => x.checked);
        updateClubButton();
        renderClub();
      }));
    }
  }

  // Trigger Month Setup
  window.updateMonthDropdown();
  updateClubButton();
  renderClub();
};

function updateClubButton() {
  const con = document.getElementById("clubDropdownList");
  const btn = document.getElementById("clubDropdownBtn");
  if(!con || !btn) return;
  
  const boxes = Array.from(con.querySelectorAll("input:not([value='__ALL__'])"));
  const checked = boxes.filter(b=>b.checked);
  
  if (checked.length === boxes.length) {
    btn.textContent = "All Clubs";
  } else if (checked.length === 0) {
    btn.textContent = "Select Clubs";
  } else if (checked.length === 1) {
    btn.textContent = checked[0].value;
  } else {
    btn.textContent = `${checked.length} Clubs Selected`;
  }
}

// 4. Main Render Function
function renderClub() {
  const p = window.pal();
  const cmn = window.apexCommon();
  const clubCon = document.getElementById("clubDropdownList");
  const monthCon = document.getElementById("monthDropdownList");
  
  // Safety: If HTML missing, don't crash
  if(!clubCon || !monthCon) return;

  // Initialize if empty
  if(clubCon.children.length === 0) { 
    if(window.ST.filtered && window.ST.filtered.length > 0) setupClub(window.ST.filtered); 
    return; 
  }

  // A. Get Selected Clubs
  const cInputs = Array.from(clubCon.querySelectorAll("input"));
  const cAll = cInputs.find(i=>i.value==="__ALL__");
  const allowedClubs = (cAll && cAll.checked) 
    ? null 
    : cInputs.filter(i => i.checked && i.value !== "__ALL__").map(i => i.value);

  // B. Get Selected Months
  const mInputs = Array.from(monthCon.querySelectorAll("input"));
  const mAll = mInputs.find(i=>i.value==="__ALL__");
  const allowedMonths = (mAll && mAll.checked) 
    ? null 
    : mInputs.filter(i => i.checked && i.value !== "__ALL__").map(i => i.value);

  // C. Filter Data
  let rows = window.ST.filtered.filter(r => {
    // Check Club
    if (allowedClubs !== null) {
        const cName = (r["club name"]||"").trim();
        if (!allowedClubs.includes(cName)) return false;
    }
    // Check Month
    if (allowedMonths !== null) {
        if (!(r.dateParsed instanceof Date) || isNaN(r.dateParsed.getTime())) return false;
        const k = window.monthKey(r.dateParsed);
        if (!allowedMonths.includes(k)) return false;
    }
    return true;
  });

  // D. KPIs
  const total = rows.length;
  const bc = rows.filter(r=>(r["membership type"]||"").toUpperCase().includes("BLACK")).length;
  const nr = rows.filter(r=>(r["membership type"]||"").toUpperCase().includes("10NR")).length;
  
  updateVal("ckpiTotal", total.toLocaleString());
  updateVal("ckpiBC", bc.toLocaleString());
  updateVal("ckpi10NR", nr.toLocaleString());
  updateVal("ckpiRatio", total > 0 ? ((bc/total)*100).toFixed(1)+"%" : "0%");

  // E. Charts
  if(total === 0) { 
    ['clubRegionDonut','clubTrend','clubUsage','topClubsChart'].forEach(id => destroyChart(id));
    return; 
  }

  // Donut
  renderApex("clubRegionDonut", {
    ...cmn,
    chart: { type: 'donut', height: 260, background: 'transparent' },
    labels: ['Black Card', '10NR'],
    colors: [p.us, p.can],
    series: [bc, nr],
    stroke: { width: 0 },
    plotOptions: { pie: { donut: { size: '65%' } } },
    dataLabels: {
      enabled: true,
      formatter: function (val, opts) { return opts.w.config.series[opts.seriesIndex]; },
      style: { fontSize: '13px', fontWeight: 700 }
    },
    legend: { show: true, position: 'bottom', labels: { colors: p.text } }
  });

  // Trend
  const mData = {};
  rows.forEach(r => {
    if(r.dateParsed instanceof Date && !isNaN(r.dateParsed.getTime())) {
      const k = window.monthKey(r.dateParsed);
      mData[k] = (mData[k]||0)+1;
    }
  });
  const mKeys = Object.keys(mData).sort();
  renderApex("clubTrend", {
    ...cmn,
    chart: { type: 'area', height: 360, toolbar:{show:false}, background:'transparent' },
    colors: [p.us],
    stroke: { curve: 'smooth', width: 3 },
    fill: { type: 'gradient', gradient: { shadeIntensity:1, opacityFrom:0.4, opacityTo:0.05 } },
    series: [{ name: "Signups", data: mKeys.map(k=>mData[k]) }],
    xaxis: { categories: mKeys.map(window.monthLbl), labels: { style: { colors: p.text } } }
  });

  // Top Codes
  const pCnt={};
  rows.forEach(r=>{ const pn=(r["promotion name"]||"").trim(); if(pn) pCnt[pn]=(pCnt[pn]||0)+1; });
  const topC = Object.entries(pCnt).sort((a,b)=>b[1]-a[1]).slice(0,5);
  renderApex("clubUsage", {
    ...cmn,
    chart: { type: 'bar', height: 260, toolbar:{show:false}, background:'transparent' },
    colors: [p.accent],
    stroke: { show: false },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '50%' } },
    series: [{ name: "Count", data: topC.map(t=>t[1]) }],
    xaxis: { categories: topC.map(t=>t[0]), labels: { style: { colors: p.text } } }
  });
  
  renderTopClubs(rows);
}

function renderTopClubs(data) {
  const p = window.pal();
  const cmn = window.apexCommon();
  const cUS={}, cCAN={};
  data.forEach(r => {
    const c = (r["club name"]||"").trim();
    if(c) {
      const reg = window.normReg(r["region"]);
      if(reg==="US") cUS[c]=(cUS[c]||0)+1;
      if(reg==="CAN") cCAN[c]=(cCAN[c]||0)+1;
    }
  });
  const all = [...new Set([...Object.keys(cUS), ...Object.keys(cCAN)])];
  const top = all.sort((a,b)=> ((cUS[b]||0)+(cCAN[b]||0)) - ((cUS[a]||0)+(cCAN[a]||0)) ).slice(0,5);
  
  renderApex("topClubsChart", {
    ...cmn,
    chart: { type: 'bar', height: 400, stacked: true, toolbar:{show:false}, background:'transparent' },
    colors: [p.us, p.can],
    stroke: { show: false },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
    series: [
      { name: 'US', data: top.map(c=>cUS[c]||0) },
      { name: 'CAN', data: top.map(c=>cCAN[c]||0) }
    ],
    xaxis: { categories: top, labels: { style: { colors: p.text } } }, 
    yaxis: { labels: { maxWidth: 400, style: { colors: p.text, fontSize: '12px' } } },
    legend: { show: true, position: 'top', labels: { colors: p.text } }
  });
}

// UI HELPER
function updateVal(id, v) { const e=document.getElementById(id); if(e) e.textContent=v; }

window.resizeCharts = function() {
  // Resize all active chart instances
  Object.values(window.CHART_INSTANCES).forEach(chart => {
    if (chart && typeof chart.windowResizeHandler === 'function') {
      chart.windowResizeHandler();
    }
  });
};