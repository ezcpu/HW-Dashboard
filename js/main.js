// ----------------------------------------------------------------------
// EXPLICIT GLOBAL FUNCTIONS 
// Guaranteed to be accessible by your HTML buttons instantly
// ----------------------------------------------------------------------

window.openTab = function(tab) {
  // 1. Reset all button styles
  document.querySelectorAll(".tab-button").forEach(b => {
    b.classList.remove("active");
    b.setAttribute("aria-selected", "false");
  });
  
  // 2. Highlight clicked button
  const activeBtn = document.querySelector(`button[onclick*="openTab('${tab}')"]`);
  if (activeBtn) {
    activeBtn.classList.add("active");
    activeBtn.setAttribute("aria-selected", "true");
  }

  // 3. Hide all panels
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  
  // 4. Show target panel
  const activePanel = document.getElementById(tab);
  if (activePanel) activePanel.classList.add("active");

  // 5. Trigger charts if data exists
  if (window.ST && window.ST.loaded) {
    if (tab === "current" && typeof renderCurrent === 'function') renderCurrent(window.ST.filtered);
    if (tab === "clubInsights" && typeof renderClub === 'function') renderClub();
    if (tab === "employerPaid" && typeof renderEmployer === 'function') renderEmployer();
    if (tab === "active" && typeof renderPartners === 'function') renderPartners();
    
    // Slight delay ensures DOM is fully visible before resizing charts
    if (typeof resizeCharts === 'function') setTimeout(resizeCharts, 50);
  }
};

window.toggleTheme = function() {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  
  const themeText = document.getElementById("themeText");
  const themeIcon = document.getElementById("themeIcon");
  
  if(themeText) themeText.textContent = isDark ? "Light Mode" : "Dark Mode";
  if(themeIcon) {
    themeIcon.innerHTML = isDark 
      ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>' 
      : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }

  if (typeof window.updateDashboard === 'function') window.updateDashboard();
};

window.toggleClubDropdown = function(e) { 
  if(e) e.stopPropagation(); 
  const cList = document.getElementById("clubDropdownList");
  const cBtn = document.getElementById("clubDropdownBtn");
  const mList = document.getElementById("monthDropdownList");
  const mBtn = document.getElementById("monthDropdownBtn");

  // Close Month Dropdown
  if(mList) mList.classList.remove("show");
  if(mBtn) { mBtn.classList.remove("active"); mBtn.setAttribute("aria-expanded", "false"); }

  // Toggle Club Dropdown
  if(cList && cBtn) {
    const isShowing = cList.classList.contains("show");
    cList.classList.toggle("show");
    cBtn.classList.toggle("active"); 
    cBtn.setAttribute("aria-expanded", !isShowing); 
  }
};

window.toggleMonthDropdown = function(e) { 
  if(e) e.stopPropagation(); 
  const cList = document.getElementById("clubDropdownList");
  const cBtn = document.getElementById("clubDropdownBtn");
  const mList = document.getElementById("monthDropdownList");
  const mBtn = document.getElementById("monthDropdownBtn");

  // Close Club Dropdown
  if(cList) cList.classList.remove("show");
  if(cBtn) { cBtn.classList.remove("active"); cBtn.setAttribute("aria-expanded", "false"); }

  // Toggle Month Dropdown
  if(mList && mBtn) {
    const isShowing = mList.classList.contains("show");
    mList.classList.toggle("show");
    mBtn.classList.toggle("active"); 
    mBtn.setAttribute("aria-expanded", !isShowing); 
  }
};

window.exportPDF = function() {
  if (!window.jspdf || !window.ST || !window.ST.loaded) { alert("System not ready or data missing."); return; }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const activeTab = document.querySelector(".tab-content.active")?.id || "current";
  const dateStr = new Date().toLocaleDateString();
  
  doc.setFontSize(18);
  doc.text("H&W Enterprise Report", 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${dateStr} | View: ${activeTab.toUpperCase()}`, 14, 28);

  let head = [], body = [];

  if (activeTab === "active") {
    head = [['Region', 'Company Name', 'Payment Type', 'Document']];
    body = (window.ST.partnersData || []).map(p => [ p.region, p.name, p.pay || "N/A", p.link ? "Yes" : "No" ]);
  } else if (activeTab === "employerPaid") {
    head = [['Company / Group', 'Total Members']];
    const cards = document.querySelectorAll(".employer-card");
    if(cards.length) {
      cards.forEach(card => {
        const name = card.querySelector(".emp-name")?.innerText || "";
        const count = card.querySelector(".emp-count")?.innerText || "0";
        if(name) body.push([name, count]);
      });
    }
  } else {
    head = [['Region', 'Club Name', 'Membership', 'Join Date']];
    body = (window.ST.filtered || []).map(r => [
      typeof window.normReg === 'function' ? window.normReg(r["region"]) : r["region"],
      r["club name"] || "Unknown",
      r["membership type"] || "-",
      r.dateParsed ? r.dateParsed.toLocaleDateString() : "N/A"
    ]);
  }

  if (body.length === 0) { alert("No data to export for this view."); return; }

  doc.autoTable({
    startY: 35, head: head, body: body, theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] }, styles: { fontSize: 8, font: "helvetica" }
  });
  doc.save(`HW_Report_${activeTab}_${new Date().toISOString().slice(0,10)}.pdf`);
};

window.renderEmptyState = function(id, msg) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<div style="text-align:center; padding:32px; color:var(--text-muted); opacity:0.8; font-size:13px;">${msg}</div>`;
};

window.clearFilters = function() {
  const mList = document.getElementById("monthDropdownList");
  if(mList) { mList.querySelectorAll("input").forEach(i => i.checked = (i.value === "__ALL__")); }
  if(typeof updateMonthButton === 'function') updateMonthButton();

  const cList = document.getElementById("clubDropdownList");
  if (cList) { cList.querySelectorAll("input").forEach(i => i.checked = (i.value === "__ALL__")); }
  if (typeof updateClubButton === 'function') updateClubButton(); 
  
  if (typeof renderClub === 'function') renderClub();
};

window.setupGlobalYear = function() {
  const sel = document.getElementById("yearSelect");
  if (!sel || !window.ST || !window.ST.data) return;
  const years = new Set(window.ST.data.map(r => isNaN(r.dateParsed) ? null : r.dateParsed.getFullYear()).filter(Boolean));
  years.add(2025); years.add(2026);
  const sorted = [...years].sort((a,b)=>b-a);
  sel.innerHTML = '<option value="all">All Years</option>';
  sorted.forEach(y => { const o = document.createElement("option"); o.value = y; o.textContent = y; sel.appendChild(o); });
  sel.onchange = window.updateDashboard;
  sel.value = "2026";
};

window.updateDashboard = function() {
  if(!window.ST || !window.ST.data) return;
  const yr = document.getElementById("yearSelect")?.value || "all";
  
  window.ST.filtered = window.ST.data.filter(r => {
    if (yr === "all") return true;
    const d = r.dateParsed;
    return !(isNaN(d) || String(d.getFullYear()) !== yr);
  });

  window.ST.months = [...new Set(window.ST.filtered.map(r => 
    isNaN(r.dateParsed) ? null : (typeof window.monthKey === 'function' ? window.monthKey(r.dateParsed) : null)
  ).filter(Boolean))].sort().reverse(); 
  
  const clubList = document.getElementById("clubDropdownList");
  if(clubList) clubList.innerHTML = "";
  
  const monthList = document.getElementById("monthDropdownList");
  if(monthList) monthList.innerHTML = "";
  
  const activeTab = document.querySelector(".tab-content.active");
  if (activeTab) window.openTab(activeTab.id);
};

// ----------------------------------------------------------------------
// INITIALIZATION ON LOAD
// ----------------------------------------------------------------------

// Close dropdowns when clicking anywhere outside
window.addEventListener('click', e => {
  [
    { list: document.getElementById("clubDropdownList"), btn: document.getElementById("clubDropdownBtn") },
    { list: document.getElementById("monthDropdownList"), btn: document.getElementById("monthDropdownBtn") }
  ].forEach(({list, btn}) => {
    if (list && list.classList.contains('show') && !list.contains(e.target) && btn && !btn.contains(e.target)) {
      list.classList.remove('show');
      btn.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  // Apply Default System Theme
  const savedTheme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
    document.body.classList.add("dark");
    // Trigger UI toggle to match
    const themeText = document.getElementById("themeText");
    const themeIcon = document.getElementById("themeIcon");
    if(themeText) themeText.textContent = "Light Mode";
    if(themeIcon) themeIcon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  }

  // Load App Data
  if (typeof window.loadData === 'function') window.loadData();
  
  let timer;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { if(window.resizeCharts) window.resizeCharts(); }, 150);
  });
});
