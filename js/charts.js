function renderCurrent(data) {
  const p = window.pal();

  // Calculate Counts
  const total = data.length;
  const bcCount = data.filter(r => (r["membership type"] || "").toUpperCase().includes("BLACK")).length;
  const nrCount = data.filter(r => (r["membership type"] || "").toUpperCase().includes("10NR")).length;

  // Update DOM Elements
  document.getElementById("kpiTotal").textContent = total.toLocaleString();
  document.getElementById("kpiBC").textContent = bcCount.toLocaleString();
  document.getElementById("kpi10NR").textContent = nrCount.toLocaleString();

  // --- KPI: Black Card Ratio ---
  // Avoid division by zero
  const ratio = total > 0 ? ((bcCount / total) * 100).toFixed(1) + "%" : "0.0%";
  const elRatio = document.getElementById("kpiRatio");
  if (elRatio) elRatio.textContent = ratio;

  const tot = { US: 0, CAN: 0 },
        bc = { US: 0, CAN: 0 },
        nr = { US: 0, CAN: 0 };

  data.forEach(r => {
    const reg = window.normReg(r["region"]);
    if (!(reg in tot)) return;
    tot[reg]++;
    const m = (r["membership type"] || "").toUpperCase();
    if (m.includes("BLACK")) bc[reg]++;
    if (m.includes("10NR")) nr[reg]++;
  });

  // CHART 1: Total Members
  Plotly.newPlot("regionTotalChart", [{
    x: Object.keys(tot), y: Object.values(tot), type: "bar",
    marker: { color: [p.us, p.can] },
    text: Object.values(tot), textposition: "auto",
    textfont: { color: "white", size: 14 },
    textangle: 0
  }], { ...window.lay("Members","Region"), height: 300 }, window.pcfg);

  // CHART 2: Black Card
  Plotly.newPlot("regionBCChart", [{
    x: Object.keys(bc), y: Object.values(bc), type: "bar",
    marker: { color: [p.us, p.can] },
    text: Object.values(bc), textposition: "auto",
    textfont: { color: "white", size: 14 },
    textangle: 0
  }], { ...window.lay("Members","Region"), height: 300 }, window.pcfg);

  // CHART 3: 10NR
  Plotly.newPlot("region10NRChart", [{
    x: Object.keys(nr), y: Object.values(nr), type:"bar",
    marker:{color:[p.us,p.can]},
    text:Object.values(nr), textposition:"auto",
    textfont: { color: "white", size: 14 },
    textangle: 0
  }], { ...window.lay("Members","Region"), height: 300 }, window.pcfg);

  const mUS = {}, mCAN = {};
  data.forEach(r => {
    const d = r.dateParsed;
    if (isNaN(d)) return;
    const k = window.monthKey(d);
    const reg = window.normReg(r["region"]);
    if (reg === "US") mUS[k] = (mUS[k] || 0) + 1;
    if (reg === "CAN") mCAN[k] = (mCAN[k] || 0) + 1;
  });

  const kUS = Object.keys(mUS).sort(), kCAN = Object.keys(mCAN).sort();

  Plotly.newPlot("impactUS", [{
    x: kUS.map(window.monthLbl), y: kUS.map(k => mUS[k]), type:"bar", marker:{color:p.us}
  }], { ...window.lay("Signups","Month"), height:300 }, window.pcfg);

  Plotly.newPlot("impactCAN", [{
    x: kCAN.map(window.monthLbl), y: kCAN.map(k => mCAN[k]), type:"bar", marker:{color:p.can}
  }], { ...window.lay("Signups","Month"), height:300 }, window.pcfg);

  // Top promo codes
  const pReg = { US:{}, CAN:{} };
  data.forEach(r => {
    const pn = (r["promotion name"] || "").trim();
    if (!pn) return;
    const reg = window.normReg(r["region"]);
    if (!(reg in pReg)) return;
    pReg[reg][pn] = (pReg[reg][pn] || 0) + 1;
  });

  const all = new Set([...Object.keys(pReg.US), ...Object.keys(pReg.CAN)]);
  const pTot = {};
  all.forEach(pn => pTot[pn] = (pReg.US[pn] || 0) + (pReg.CAN[pn] || 0));

  const top = Object.entries(pTot).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([pn])=>pn);

  if (!top.length) {
    document.getElementById("promoChart").innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">📊</div><p>No promotion data</p></div>';
  } else {
    Plotly.newPlot("promoChart", [
      { name:"US", x: top.map(pn=>pReg.US[pn]||0), y: top, type:"bar", orientation:"h", marker:{color:p.us}},
      { name:"CAN", x: top.map(pn=>pReg.CAN[pn]||0), y: top, type:"bar", orientation:"h", marker:{color:p.can}}
    ], { ...window.lay("", "Usage"), barmode:"group", margin:{t:20,l:180,b:50,r:20}, height:350 }, window.pcfg);
  }
}

// UPDATE BUTTON LABEL
function updateClubButton() {
  const container = document.getElementById("clubDropdownList");
  if (!container) return;
  const checkboxes = Array.from(container.querySelectorAll("input[type='checkbox']"));
  const allCb = checkboxes.find(cb => cb.value === "__ALL__");
  const others = checkboxes.filter(cb => cb.value !== "__ALL__");
  
  const checkedCount = others.filter(cb => cb.checked).length;
  const btn = document.getElementById("clubDropdownBtn");
  
  if (allCb.checked || checkedCount === others.length) {
    btn.textContent = "All Clubs";
  } else if (checkedCount === 0) {
    btn.textContent = "Select Clubs...";
  } else {
    btn.textContent = `${checkedCount} Selected`;
  }
}

// CLUB FILTERS
window.setupClub = function(data) {
  const container = document.getElementById("clubDropdownList");
  const ms = document.getElementById("monthSelect");

  if (!container || !ms) return;
  container.innerHTML = ""; // Clear existing
  ms.innerHTML = '<option value="all" selected>All Months</option>'; // Clear existing months

  const clubs = [...new Set(data.map(r => (r["club name"] || "").trim()).filter(Boolean))].sort();

  // 1. Add "Select All"
  const allLabel = document.createElement("label");
  allLabel.className = "checkbox-item";
  allLabel.innerHTML = `<input type="checkbox" value="__ALL__" checked> <span>All Clubs</span>`;
  container.appendChild(allLabel);

  const allCb = allLabel.querySelector("input");

  // 2. Add individual clubs
  clubs.forEach(c => {
    const lbl = document.createElement("label");
    lbl.className = "checkbox-item";
    lbl.innerHTML = `<input type="checkbox" value="${c}" checked> <span>${c}</span>`;
    container.appendChild(lbl);
  });

  const checkboxes = Array.from(container.querySelectorAll("input[type='checkbox']"));
  const others = checkboxes.filter(cb => cb.value !== "__ALL__");

  // 3. Event Listeners
  allCb.addEventListener("change", (e) => {
    const checked = e.target.checked;
    others.forEach(cb => cb.checked = checked);
    updateClubButton();
    renderClub();
  });

  others.forEach(cb => {
    cb.addEventListener("change", () => {
      const allChecked = others.every(c => c.checked);
      allCb.checked = allChecked;
      updateClubButton();
      renderClub();
    });
  });

  // Month setup
  window.ST.months.forEach(m => {
    const o = document.createElement("option");
    o.value = m;
    o.textContent = window.monthLbl(m);
    ms.appendChild(o);
  });

  ms.onchange = renderClub;
  renderClub();
}

function renderClub() {
  const p = window.pal();
  const mSelect = document.getElementById("monthSelect");
  
  const container = document.getElementById("clubDropdownList");
  if (!container || !mSelect) return;

  const checkboxes = Array.from(container.querySelectorAll("input[type='checkbox']"));
  const allCb = checkboxes.find(cb => cb.value === "__ALL__");
  
  let selectedClubs = [];
  if (allCb && allCb.checked) {
    selectedClubs = ["__ALL__"];
  } else {
    selectedClubs = checkboxes
      .filter(cb => cb.value !== "__ALL__" && cb.checked)
      .map(cb => cb.value);
  }

  const m = mSelect.value;
  const showAllClubs = selectedClubs.includes("__ALL__");

  let rows = [...window.ST.filtered];

  // Filter by Club
  if (!showAllClubs) {
    if (selectedClubs.length === 0) {
      rows = []; // Nothing selected
    } else {
      rows = rows.filter(r => selectedClubs.includes((r["club name"] || "").trim()));
    }
  }

  // Filter by Month
  if (m !== "all") rows = rows.filter(r => !isNaN(r.dateParsed) && window.monthKey(r.dateParsed) === m);

  // Handle Empty State
  if (rows.length === 0) {
    document.getElementById("ckpiTotal").textContent = "0";
    document.getElementById("ckpiBC").textContent = "0";
    document.getElementById("ckpi10NR").textContent = "0";
    document.getElementById("ckpiCodes").textContent = "0";

    if (typeof renderEmptyState === 'function') {
      renderEmptyState("clubRegionDonut", "No members match these filters");
      renderEmptyState("clubUsage", "No data available");
      renderEmptyState("clubTrend", "No signups found");
    }
    return;
  }

  document.getElementById("ckpiTotal").textContent = rows.length.toLocaleString();
  document.getElementById("ckpiBC").textContent =
    rows.filter(r => (r["membership type"] || "").toUpperCase().includes("BLACK")).length.toLocaleString();
  document.getElementById("ckpi10NR").textContent =
    rows.filter(r => (r["membership type"] || "").toUpperCase().includes("10NR")).length.toLocaleString();
  document.getElementById("ckpiCodes").textContent =
    new Set(rows.map(r => (r["promotion name"] || "").trim()).filter(Boolean)).size;

  const rCnt = { US:0, CAN:0 };
  rows.forEach(r => {
    const reg = window.normReg(r["region"]);
    if (rCnt[reg] != null) rCnt[reg]++;
  });

  Plotly.newPlot("clubRegionDonut", [{
    labels:["US","CAN"], values:[rCnt.US,rCnt.CAN], type:"pie", hole:.6,
    marker:{colors:[p.us,p.can]}, textinfo:"label+percent"
  }], { paper_bgcolor:p.paper, plot_bgcolor:p.plot, showlegend:false }, window.pcfg);

  const pCnt = {};
  rows.forEach(r => {
    const pn = (r["promotion name"] || "").trim();
    if (pn) pCnt[pn] = (pCnt[pn] || 0) + 1;
  });

  const topCodes = Object.entries(pCnt).sort((a,b)=>b[1]-a[1]).slice(0,5);

  Plotly.newPlot("clubUsage", [{
    x: topCodes.map(t => t[1]), y: topCodes.map(t => t[0]),
    type:"bar", orientation:"h", marker:{color:p.accent}
  }], { ...window.lay("", "Usage"), margin:{t:10,l:160,b:50,r:20}, height:280 }, window.pcfg);

  const mData = {};
  rows.forEach(r => {
    const d = r.dateParsed;
    if (!isNaN(d)) mData[window.monthKey(d)] = (mData[window.monthKey(d)] || 0) + 1;
  });

  const mKeys = Object.keys(mData).sort();

  Plotly.newPlot("clubTrend", [{
    x: mKeys.map(window.monthLbl), y: mKeys.map(k => mData[k]),
    type:"scatter", mode:"lines+markers", line:{width:3,color:p.us}, marker:{size:8}
  }], { ...window.lay("Signups", "Month"), height:300 }, window.pcfg);
}

window.renderTopClubs = function() {
  const p = window.pal();
  const rows = window.ST.filtered;
  const cUS = {}, cCAN = {};

  rows.forEach(r => {
    const club = (r["club name"] || "").trim();
    const promo = (r["promotion name"] || "").trim();
    const reg = window.normReg(r["region"]);

    if (!club || !promo) return;
    if (reg === "US") { cUS[club] = cUS[club] || { count:0, promo }; cUS[club].count++; }
    if (reg === "CAN") { cCAN[club] = cCAN[club] || { count:0, promo }; cCAN[club].count++; }
  });

  const all = new Set([...Object.keys(cUS), ...Object.keys(cCAN)]);
  const tots = {};
  all.forEach(c => tots[c] = (cUS[c]?.count || 0) + (cCAN[c]?.count || 0));

  const top = Object.entries(tots).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([c])=>c);
  const names = top.map(c => {
    const promo = cUS[c]?.promo || cCAN[c]?.promo || "";
    return promo ? `${c} (${promo})` : c;
  });

  Plotly.newPlot("topClubsChart", [
    { name:"US", x: top.map(c => cUS[c]?.count || 0), y: names, type:"bar", orientation:"h", marker:{color:p.us}},
    { name:"CAN", x: top.map(c => cCAN[c]?.count || 0), y: names, type:"bar", orientation:"h", marker:{color:p.can}}
  ], {
    ...window.lay("", "Usage"),
    barmode: "group",
    margin:{t:20,l:320,b:50,r:20},
    height:350
  }, window.pcfg);
}

window.resizeCharts = function() {
  const plots = document.querySelectorAll('.js-plotly-plot');
  plots.forEach(plot => {
    Plotly.Plots.resize(plot);
  });
}