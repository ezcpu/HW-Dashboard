// PDF Export Logic
window.exportPDF = function() {
  if (!window.jspdf || !window.ST.loaded) { alert("System not ready or data missing."); return; }
  
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
    // NEW: Scrape Cards instead of Table
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
    body = window.ST.filtered.map(r => [
      window.normReg(r["region"]),
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

// ... (Rest of main.js remains unchanged) ...
// UI Helpers
function renderEmptyState(id, msg) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<div style="text-align:center; padding:32px; color:var(--text-muted); opacity:0.8; font-size:13px;">${msg}</div>`;
}

function clearFilters() {
  const ms = document.getElementById("monthSelect"); if(ms) ms.value = "all";
  const con = document.getElementById("clubDropdownList");
  if (con) { con.querySelectorAll("input").forEach(i => i.checked = (i.value === "__ALL__")); if (typeof updateClubButton === 'function') updateClubButton(); }
  if (typeof renderClub === 'function') renderClub();
}

function toggleClubDropdown(e) { if(e) e.stopPropagation(); document.getElementById("clubDropdownList")?.classList.toggle("show"); }

window.addEventListener('click', e => {
  const m = document.getElementById("clubDropdownList");
  const b = document.getElementById("clubDropdownBtn");
  if (m && m.classList.contains('show') && !m.contains(e.target) && !b.contains(e.target)) m.classList.remove('show');
});

// Setup & Navigation
window.setupGlobalYear = function() {
  const sel = document.getElementById("yearSelect");
  if (!sel) return;
  const years = new Set(window.ST.data.map(r => isNaN(r.dateParsed) ? null : r.dateParsed.getFullYear()).filter(Boolean));
  years.add(2025); years.add(2026);
  const sorted = [...years].sort((a,b)=>b-a);
  sel.innerHTML = '<option value="all">All Years</option>';
  sorted.forEach(y => { const o = document.createElement("option"); o.value = y; o.textContent = y; sel.appendChild(o); });
  sel.onchange = window.updateDashboard;
};

window.updateDashboard = function() {
  const yr = document.getElementById("yearSelect")?.value || "all";
  window.ST.filtered = window.ST.data.filter(r => {
    if (yr === "all") return true;
    const d = r.dateParsed;
    if (isNaN(d) || String(d.getFullYear()) !== yr) return false;
    return true;
  });
  window.ST.months = [...new Set(window.ST.filtered.map(r => isNaN(r.dateParsed) ? null : window.monthKey(r.dateParsed)).filter(Boolean))].sort();
  
  const active = document.querySelector(".tab-content.active");
  if (active) openTab(active.id);
};

function openTab(tab) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
  document.getElementById(tab)?.classList.add("active");
  document.querySelector(`button[onclick="openTab('${tab}')"]`)?.classList.add("active");

  if (!window.ST.loaded) return; 
  if (tab === "current" && typeof renderCurrent === 'function') renderCurrent(window.ST.filtered);
  if (tab === "clubInsights" && typeof renderClub === 'function') renderClub();
  if (tab === "employerPaid" && typeof renderEmployer === 'function') renderEmployer();
  if (tab === "active" && typeof renderPartners === 'function') renderPartners();
  
  if (typeof resizeCharts === 'function') requestAnimationFrame(resizeCharts);
}

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  const themeBtn = document.getElementById("themeToggle");
  const themeText = document.getElementById("themeText");
  const themeIcon = document.getElementById("themeIcon");

  const moonIcon = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  const sunIcon = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';

  function updateThemeUI() {
    const isDark = document.body.classList.contains("dark");
    if(themeText) themeText.textContent = isDark ? "Light Mode" : "Dark Mode";
    if(themeIcon) themeIcon.innerHTML = isDark ? sunIcon : moonIcon;
  }

  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
  }
  updateThemeUI();

  if(themeBtn) {
    themeBtn.onclick = () => {
      document.body.classList.toggle("dark");
      localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
      updateThemeUI();
      
      if (typeof window.updateDashboard === 'function') {
        window.updateDashboard();
      }
    };
  }

  if (typeof window.loadData === 'function') window.loadData();
  
  let timer;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { if(window.resizeCharts) window.resizeCharts(); }, 150);
  });
});