function renderEmptyState(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<div style="text-align:center; padding:32px; color:var(--text-muted); opacity:0.8; font-size:13px;">${msg}</div>`;
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
  
  // Render functions now handle ApexCharts creation
  if (tab === "current" && typeof renderCurrent === 'function') renderCurrent(window.ST.filtered);
  if (tab === "clubInsights" && typeof renderClub === 'function') renderClub();
  if (tab === "employerPaid" && typeof renderEmployer === 'function') renderEmployer();
  if (tab === "active" && typeof renderPartners === 'function') renderPartners();
  
  if (typeof resizeCharts === 'function') requestAnimationFrame(resizeCharts);
}

function exportCSV() {
  if (!window.Papa) return;
  const tab = document.querySelector(".tab-content.active")?.id || "current";
  const data = (tab === "active") ? window.ST.partnersData : window.ST.filtered;
  if (!data || !data.length) { alert("No data to export"); return; }
  
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `export_${tab}_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    if(document.getElementById("themeToggle")) document.getElementById("themeToggle").innerHTML = 'Light Mode';
  }
  const tBtn = document.getElementById("themeToggle");
  if(tBtn) tBtn.onclick = toggleTheme;

  if (typeof window.loadData === 'function') window.loadData();
  
  let timer;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { if(window.resizeCharts) window.resizeCharts(); }, 150);
  });
});