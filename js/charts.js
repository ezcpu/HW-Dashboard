function renderCurrent(data) {
  const p = pal();

  document.getElementById("kpiTotal").textContent = data.length.toLocaleString();
  document.getElementById("kpiBC").textContent =
    data.filter(r => (r["membership type"] || "").toUpperCase().includes("BLACK")).length.toLocaleString();
  document.getElementById("kpi10NR").textContent =
    data.filter(r => (r["membership type"] || "").toUpperCase().includes("10NR")).length.toLocaleString();
  document.getElementById("kpiPromo").textContent =
    new Set(data.map(r => (r["promotion name"] || "").trim()).filter(Boolean)).size;

  const tot = { US: 0, CAN: 0 },
        bc = { US: 0, CAN: 0 },
        nr = { US: 0, CAN: 0 };

  data.forEach(r => {
    const reg = normReg(r["region"]);
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
    // FIXED: Ensure size is explicit
    textfont: { color: "white", size: 14 },
    textangle: 0
  }], { ...lay("Members","Region"), height: 300 }, pcfg);

  // CHART 2: Black Card
  Plotly.newPlot("regionBCChart", [{
    x: Object.keys(bc), y: Object.values(bc), type: "bar",
    marker: { color: [p.us, p.can] },
    text: Object.values(bc), textposition: "auto",
    // FIXED: Added size: 14 to match Chart 1
    textfont: { color: "white", size: 14 },
    textangle: 0
  }], { ...lay("Members","Region"), height: 300 }, pcfg);

  // CHART 3: 10NR
  Plotly.newPlot("region10NRChart", [{
    x: Object.keys(nr), y: Object.values(nr), type:"bar",
    marker:{color:[p.us,p.can]},
    text:Object.values(nr), textposition:"auto",
    // FIXED: Added size: 14 to match Chart 1
    textfont: { color: "white", size: 14 },
    textangle: 0
  }], { ...lay("Members","Region"), height: 300 }, pcfg);

  const mUS = {}, mCAN = {};
  data.forEach(r => {
    const d = r.dateParsed;
    if (isNaN(d)) return;
    const k = monthKey(d);
    const reg = normReg(r["region"]);
    if (reg === "US") mUS[k] = (mUS[k] || 0) + 1;
    if (reg === "CAN") mCAN[k] = (mCAN[k] || 0) + 1;
  });

  const kUS = Object.keys(mUS).sort(), kCAN = Object.keys(mCAN).sort();

  Plotly.newPlot("impactUS", [{
    x: kUS.map(monthLbl), y: kUS.map(k => mUS[k]), type:"bar", marker:{color:p.us}
  }], { ...lay("Signups","Month"), height:300 }, pcfg);

  Plotly.newPlot("impactCAN", [{
    x: kCAN.map(monthLbl), y: kCAN.map(k => mCAN[k]), type:"bar", marker:{color:p.can}
  }], { ...lay("Signups","Month"), height:300 }, pcfg);

  // Top promo codes
  const pReg = { US:{}, CAN:{} };
  data.forEach(r => {
    const pn = (r["promotion name"] || "").trim();
    if (!pn) return;
    const reg = normReg(r["region"]);
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
    ], { ...lay("", "Usage"), barmode:"group", margin:{t:20,l:180,b:50,r:20}, height:350 }, pcfg);
  }
}

// Toggle the visibility of the dropdown
window.toggleClubMenu = function() {
  const el = document.getElementById("clubCheckboxes");
  if (el) el.classList.toggle("show");
};

// Close dropdown when clicking outside
window.addEventListener('click', function(e) {
  const multi = document.getElementById('clubMultiSelect');
  if (multi && !multi.contains(e.target)) {
    document.getElementById('clubCheckboxes').classList.remove('show');
  }
});

function setupClub(data) {
  const container = document.getElementById("clubCheckboxes");
  const ms = document.getElementById("monthSelect");
  
  if (!container) return;
  container.innerHTML = ""; // Clear existing

  // 1. Add "All Clubs" Option
  const addOption = (val, label, isChecked) => {
    const lbl = document.createElement("label");
    lbl.className = "checkbox-label";
    lbl.innerHTML = `
      <input type="checkbox" value="${val}" ${isChecked ? "checked" : ""}>
      <span>${label}</span>
    `;
    
    // Checkbox Click Logic
    const inp = lbl.querySelector("input");
    inp.onchange = () => {
      const allBoxes = Array.from(container.querySelectorAll("input"));
      
      if (val === "__ALL__") {
        // If "All" clicked, uncheck everyone else
        if (inp.checked) {
          allBoxes.forEach(b => { if (b.value !== "__ALL__") b.checked = false; });
        } else {
          // Prevent unchecking "All" if it leaves nothing selected (optional UX preference)
          inp.checked = true; 
        }
      } else {
        // If specific club clicked, uncheck "All"
        const allBox = allBoxes.find(b => b.value === "__ALL__");
        if (allBox) allBox.checked = false;
        
        // If nothing is left checked, re-check "All"
        if (!allBoxes.some(b => b.checked)) {
          if (allBox) allBox.checked = true;
        }
      }
      updateClubLabel();
      renderClub();
    };
    
    container.appendChild(lbl);
  };

  addOption("__ALL__", "All Clubs", true);

  // 2. Add Individual Clubs
  [...new Set(data.map(r => (r["club name"] || "").trim()).filter(Boolean))]
    .sort()
    .forEach(c => addOption(c, c, false));

  // 3. Setup Month Select (standard dropdown)
  ms.innerHTML = ""; // clear
  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = "All Months";
  ms.appendChild(allOpt);

  ST.months.forEach(m => {
    const o = document.createElement("option");
    o.value = m;
    o.textContent = monthLbl(m);
    ms.appendChild(o);
  });
  
  ms.onchange = renderClub;
  
  updateClubLabel(); // Initialize label
  renderClub();      // Initial render
}

function updateClubLabel() {
  const container = document.getElementById("clubCheckboxes");
  const label = document.getElementById("clubSelectLabel");
  const checked = Array.from(container.querySelectorAll("input:checked"));
  
  if (checked.some(i => i.value === "__ALL__")) {
    label.textContent = "All Clubs";
  } else if (checked.length === 0) {
    label.textContent = "Select Clubs...";
  } else if (checked.length === 1) {
    label.textContent = checked[0].parentNode.querySelector("span").textContent;
  } else {
    label.textContent = `${checked.length} Clubs Selected`;
  }
}

function renderClub() {
  const p = pal();
  const mSelect = document.getElementById("monthSelect");
  const container = document.getElementById("clubCheckboxes");

  // Get selected clubs
  const checkedInputs = Array.from(container.querySelectorAll("input:checked"));
  const selectedClubs = checkedInputs.map(i => i.value);
  const m = mSelect.value;

  let rows = [...ST.filtered];

  // Filter Logic
  // If "__ALL__" is NOT selected, filter by the specific list
  if (!selectedClubs.includes("__ALL__")) {
    rows = rows.filter(r => selectedClubs.includes((r["club name"] || "").trim()));
  }

  // Filter by Month
  if (m !== "all") {
    rows = rows.filter(r => !isNaN(r.dateParsed) && monthKey(r.dateParsed) === m);
  }

  // --- The rest of the function remains exactly the same as before ---
  
  // Handle Empty State
  if (rows.length === 0) {
    document.getElementById("ckpiTotal").textContent = "0";
    document.getElementById("ckpiBC").textContent = "0";
    document.getElementById("ckpi10NR").textContent = "0";
    document.getElementById("ckpiCodes").textContent = "0";

    renderEmptyState("clubRegionDonut", "No members match these filters");
    renderEmptyState("clubUsage", "No data available");
    renderEmptyState("clubTrend", "No signups found");
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
    const reg = normReg(r["region"]);
    if (rCnt[reg] != null) rCnt[reg]++;
  });

  Plotly.newPlot("clubRegionDonut", [{
    labels:["US","CAN"], values:[rCnt.US,rCnt.CAN], type:"pie", hole:.6,
    marker:{colors:[p.us,p.can]}, textinfo:"label+percent"
  }], { paper_bgcolor:p.paper, plot_bgcolor:p.plot, showlegend:false }, pcfg);

  const pCnt = {};
  rows.forEach(r => {
    const pn = (r["promotion name"] || "").trim();
    if (pn) pCnt[pn] = (pCnt[pn] || 0) + 1;
  });

  const topCodes = Object.entries(pCnt).sort((a,b)=>b[1]-a[1]).slice(0,5);

  Plotly.newPlot("clubUsage", [{
    x: topCodes.map(t => t[1]), y: topCodes.map(t => t[0]),
    type:"bar", orientation:"h", marker:{color:p.accent}
  }], { ...lay("", "Usage"), margin:{t:10,l:160,b:50,r:20}, height:280 }, pcfg);

  const mData = {};
  rows.forEach(r => {
    const d = r.dateParsed;
    if (!isNaN(d)) mData[monthKey(d)] = (mData[monthKey(d)] || 0) + 1;
  });

  const mKeys = Object.keys(mData).sort();

  Plotly.newPlot("clubTrend", [{
    x: mKeys.map(monthLbl), y: mKeys.map(k => mData[k]),
    type:"scatter", mode:"lines+markers", line:{width:3,color:p.us}, marker:{size:8}
  }], { ...lay("Signups", "Month"), height:300 }, pcfg);
}
  // Filter by Club(s)
  // If "__ALL__" is NOT selected, and we have selections, filter by the specific clubs
  // (Note: If "__ALL__" is selected, it overrides specific selections and shows everything)
  if (!selectedClubs.includes("__ALL__") && selectedClubs.length > 0) {
    rows = rows.filter(r => selectedClubs.includes((r["club name"] || "").trim()));
    
  // Handle Empty State
  if (rows.length === 0) {
    document.getElementById("ckpiTotal").textContent = "0";
    document.getElementById("ckpiBC").textContent = "0";
    document.getElementById("ckpi10NR").textContent = "0";
    document.getElementById("ckpiCodes").textContent = "0";

    renderEmptyState("clubRegionDonut", "No members match these filters");
    renderEmptyState("clubUsage", "No data available");
    renderEmptyState("clubTrend", "No signups found");
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
    const reg = normReg(r["region"]);
    if (rCnt[reg] != null) rCnt[reg]++;
  });

  Plotly.newPlot("clubRegionDonut", [{
    labels:["US","CAN"], values:[rCnt.US,rCnt.CAN], type:"pie", hole:.6,
    marker:{colors:[p.us,p.can]}, textinfo:"label+percent"
  }], { paper_bgcolor:p.paper, plot_bgcolor:p.plot, showlegend:false }, pcfg);

  const pCnt = {};
  rows.forEach(r => {
    const pn = (r["promotion name"] || "").trim();
    if (pn) pCnt[pn] = (pCnt[pn] || 0) + 1;
  });

  const topCodes = Object.entries(pCnt).sort((a,b)=>b[1]-a[1]).slice(0,5);

  Plotly.newPlot("clubUsage", [{
    x: topCodes.map(t => t[1]), y: topCodes.map(t => t[0]),
    type:"bar", orientation:"h", marker:{color:p.accent}
  }], { ...lay("", "Usage"), margin:{t:10,l:160,b:50,r:20}, height:280 }, pcfg);

  const mData = {};
  rows.forEach(r => {
    const d = r.dateParsed;
    if (!isNaN(d)) mData[monthKey(d)] = (mData[monthKey(d)] || 0) + 1;
  });

  const mKeys = Object.keys(mData).sort();

  Plotly.newPlot("clubTrend", [{
    x: mKeys.map(monthLbl), y: mKeys.map(k => mData[k]),
    type:"scatter", mode:"lines+markers", line:{width:3,color:p.us}, marker:{size:8}
  }], { ...lay("Signups", "Month"), height:300 }, pcfg);
}

// TOP CLUBS
function renderTopClubs() {
  const p = pal();
  const rows = ST.filtered;
  const cUS = {}, cCAN = {};

  rows.forEach(r => {
    const club = (r["club name"] || "").trim();
    const promo = (r["promotion name"] || "").trim();
    const reg = normReg(r["region"]);

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
    ...lay("", "Usage"),
    barmode: "group",
    margin:{t:20,l:320,b:50,r:20},
    height:350
  }, pcfg);
}
