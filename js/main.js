// HELPER: Empty State
function renderEmptyState(id, msg = "No data available") {
  const el = document.getElementById(id);
  if (!el) return;
  
  el.innerHTML = `
    <div class="empty-state-container">
      <div class="empty-icon">📭</div>
      <div class="empty-msg">${msg}</div>
      <button class="btn-small" onclick="clearFilters()">Clear Filters</button>
    </div>
  `;
}

// HELPER: Clear Filters
function clearFilters() {
  const cSelect = document.getElementById("clubSelect");
  const mSelect = document.getElementById("monthSelect");
  
  if(cSelect) cSelect.value = "__ALL__";
  if(mSelect) mSelect.value = "all";
  
  // Re-trigger render logic
  if (typeof renderClub === 'function') renderClub();
}

// HELPER: Export CSV
function exportCSV() {
  if (!ST.filtered || !ST.filtered.length) {
    alert("No data available to export.");
    return;
  }

  // Use PapaParse to unparse the filtered dataset
  const csv = Papa.unparse(ST.filtered);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  
  // Create download link
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `dashboard_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function openTab(tab) {
  document.querySelectorAll(".tab-content").forEach(t =>
    t.classList.remove("active")
  );

  document.querySelectorAll(".tab-button").forEach(b => {
    b.classList.remove("active");
    b.setAttribute("aria-selected","false");
  });

  const tEl = document.getElementById(tab);
  if (tEl) tEl.classList.add("active");

  const bEl = document.querySelector(`button[onclick="openTab('${tab}')"]`);
  if (bEl) {
    bEl.classList.add("active");
    bEl.setAttribute("aria-selected","true");
  }

  if (tab === "employerPaid") renderEmployer();
  else if (tab === "active") renderPartners();
  else if (["current","clubInsights"].includes(tab) && ST.loaded) rerender();

  requestAnimationFrame(resizeCharts);
}

function init() {
  // Restore theme
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    document.getElementById("themeToggle").textContent = "☀️ Light Mode";
  }

  document.getElementById("themeToggle").onclick = toggleTheme;

  loadData();

  // Resize handling
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => resizeCharts(), 100);
  });

  window.addEventListener("load", resizeCharts);
}

document.addEventListener("DOMContentLoaded", init);