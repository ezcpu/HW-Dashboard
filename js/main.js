// Wrap initialization logic to avoid global clutter where possible
// Note: window.ST and functions used by other files remain attached to window
document.addEventListener("DOMContentLoaded", () => {
  
  // 1. Cache DOM Elements for performance
  const domCache = {
    navContainer: document.getElementById("mainNav"),
    tabButtons: document.querySelectorAll(".tab-button"),
    tabContents: document.querySelectorAll(".tab-content"),
    themeBtn: document.getElementById("themeToggle"),
    themeText: document.getElementById("themeText"),
    themeIcon: document.getElementById("themeIcon"),
    clubBtn: document.getElementById("clubDropdownBtn"),
    clubList: document.getElementById("clubDropdownList"),
    monthBtn: document.getElementById("monthDropdownBtn"),
    monthList: document.getElementById("monthDropdownList"),
    exportPdfBtn: document.getElementById("exportPdfBtn")
  };

  // 2. Setup System / Saved Dark Mode Preferences
  function initTheme() {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      document.body.classList.add("dark");
    }
    updateThemeUI();
  }

  function updateThemeUI() {
    const isDark = document.body.classList.contains("dark");
    const moonIcon = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    const sunIcon = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';

    if(domCache.themeText) domCache.themeText.textContent = isDark ? "Light Mode" : "Dark Mode";
    if(domCache.themeIcon) domCache.themeIcon.innerHTML = isDark ? sunIcon : moonIcon;
  }

  if (domCache.themeBtn) {
    domCache.themeBtn.addEventListener('click', () => {
      document.body.classList.toggle("dark");
      localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
      updateThemeUI();
      if (typeof window.updateDashboard === 'function') window.updateDashboard();
    });
  }

  // 3. Setup Tab Navigation with Event Delegation & ARIA updates
  if (domCache.navContainer) {
    domCache.navContainer.addEventListener('click', (e) => {
      const button = e.target.closest('.tab-button');
      if (!button) return;
      
      const tabId = button.getAttribute('data-tab');
      
      // Update Button States & ARIA
      domCache.tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');

      // Update Panel States
      domCache.tabContents.forEach(content => content.classList.remove('active'));
      const activePanel = document.getElementById(tabId);
      if (activePanel) activePanel.classList.add('active');

      // Trigger Render Functions (if they exist from other scripts)
      if (!window.ST || !window.ST.loaded) return; 
      if (tabId === "current" && typeof renderCurrent === 'function') renderCurrent(window.ST.filtered);
      if (tabId === "clubInsights" && typeof renderClub === 'function') renderClub();
      if (tabId === "employerPaid" && typeof renderEmployer === 'function') renderEmployer();
      if (tabId === "active" && typeof renderPartners === 'function') renderPartners();
      
      if (typeof resizeCharts === 'function') requestAnimationFrame(resizeCharts);
    });
  }

  // 4. Setup Custom Dropdown Logic
  function toggleDropdown(listElem, btnElem, otherListElem, otherBtnElem) {
    // Close the other dropdown if it's open
    if (otherListElem) {
      otherListElem.classList.remove("show");
      otherBtnElem.classList.remove("active");
      otherBtnElem.setAttribute('aria-expanded', 'false');
    }

    // Toggle targeted dropdown
    if (listElem) {
      const isShowing = listElem.classList.contains("show");
      listElem.classList.toggle("show");
      btnElem.classList.toggle("active");
      btnElem.setAttribute('aria-expanded', !isShowing);
    }
  }

  if (domCache.clubBtn) {
    domCache.clubBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown(domCache.clubList, domCache.clubBtn, domCache.monthList, domCache.monthBtn);
    });
  }

  if (domCache.monthBtn) {
    domCache.monthBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown(domCache.monthList, domCache.monthBtn, domCache.clubList, domCache.clubBtn);
    });
  }

  // Close dropdowns when clicking outside
  window.addEventListener('click', e => {
    [
      { list: domCache.clubList, btn: domCache.clubBtn },
      { list: domCache.monthList, btn: domCache.monthBtn }
    ].forEach(({list, btn}) => {
      if (list && list.classList.contains('show') && !list.contains(e.target) && !btn.contains(e.target)) {
        list.classList.remove('show');
        btn.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // 5. Setup PDF Export button
  if (domCache.exportPdfBtn) {
    domCache.exportPdfBtn.addEventListener('click', window.exportPDF);
  }

  // 6. Initialize App Data
  initTheme();
  if (typeof window.loadData === 'function') window.loadData();
  
  // Resize debouncer
  let timer;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { if(window.resizeCharts) window.resizeCharts(); }, 150);
  });
});

// ----------------------------------------------------------------------
// GLOBAL FUNCTIONS (Keep attached to window for data.js / charts.js access)
// ----------------------------------------------------------------------

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
    body = (window.ST.partnersData || []).map(p => [
      p.region, p.name, p.pay || "N/A", p.link ? "Yes" : "No"
    ]);
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
      window.normReg ? window.normReg(r["region"]) : r["region"],
      r["club name"] || "Unknown",
      r["membership type"] || "-",
      r.dateParsed ? r.dateParsed.toLocaleDateString() : "N/A"
    ]);
  }

  if (body.length === 0) { alert("No data to export for this view."); return; }

  doc.autoTable({
    startY: 35,
    head: head,
    body: body,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] }, 
    styles: { fontSize: 8, font: "helvetica" }
  });

  doc.save(`HW_Report_${activeTab}_${new Date().toISOString().slice(0,10)}.pdf`);
};

window.renderEmptyState = function(id, msg) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<div style="text-align:center; padding:32px; color:var(--text-muted); opacity:0.8; font-size:13px;">${msg}</div>`;
};

window.clearFilters = function() {
  const mList = document.getElementById("monthDropdownList");
  if(mList) {
    mList.querySelectorAll("input").forEach(i => i.checked = (i.value === "__ALL__"));
    if(typeof updateMonthButton === 'function') updateMonthButton();
  }

  const cList = document.getElementById("clubDropdownList");
  if (cList) { 
    cList.querySelectorAll("input").forEach(i => i.checked = (i.value === "__ALL__")); 
    if (typeof updateClubButton === 'function') updateClubButton(); 
  }
  
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
  
  // Filter Data
  window.ST.filtered = window.ST.data.filter(r => {
    if (yr === "all") return true;
    const d = r.dateParsed;
    if (isNaN(d) || String(d.getFullYear()) !== yr) return false;
    return true;
  });

  // Generate Months (Descending)
  window.ST.months = [...new Set(window.ST.filtered.map(r => 
    isNaN(r.dateParsed) ? null : (typeof window.monthKey === 'function' ? window.monthKey(r.dateParsed) : null)
  ).filter(Boolean))].sort().reverse(); 
  
  // Reset Filters
  const clubList = document.getElementById("clubDropdownList");
  if(clubList) clubList.innerHTML = "";
  
  const monthList = document.getElementById("monthDropdownList");
  if(monthList) monthList.innerHTML = "";
  
  // Re-trigger the active tab render
  const activeTab = document.querySelector(".tab-content.active");
  if (activeTab) {
    const tabBtn = document.querySelector(`.tab-button[data-tab="${activeTab.id}"]`);
    if(tabBtn) tabBtn.click();
  }
};
