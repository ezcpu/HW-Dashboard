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
  const mSelect = document.getElementById("monthSelect");
  if(mSelect) mSelect.value = "all";

  // Reset Checkboxes to "All"
  const container = document.getElementById("clubDropdownList");
  if (container) {
    const inputs = container.querySelectorAll("input[type='checkbox']");
    inputs.forEach(input => {
      input.checked = (input.value === "__ALL__");
    });
    if (typeof updateClubButton === 'function') updateClubButton();
  }
  
  // Re-trigger render logic
  if (typeof renderClub === 'function') renderClub();
}

// HELPER: Toggle Dropdown
function toggleClubDropdown(e) {
  if(e) e.stopPropagation();
  const menu = document.getElementById("clubDropdownList");
  if(menu) menu.classList.toggle("show");
}

// Close dropdown when clicking outside
window.addEventListener('click', function(e) {
  const menu = document.getElementById("clubDropdownList");
  const btn = document.getElementById("clubDropdownBtn");
  if (menu && menu.classList.contains('show')) {
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      menu.classList.remove('show');
    }
  }
});

// --- NEW GLOBAL FILTER LOGIC ---

window.setupGlobalYear = function() {
  const sel = document.getElementById("yearSelect");
  if (!sel) return;

  // Extract years from the PRE-FILTERED data
  const years = new Set(window.ST.data.map(r => {
    return isNaN(r.dateParsed) ? null : r.dateParsed.getFullYear();
  }).filter(Boolean));

  // Explicitly add 2025 and 2026 as requested
  years.add(2025);
  years.add(2026);

  // Sort descending
  const sortedYears = [...years].sort((a,b) => b - a);

  // Populate
  sel.innerHTML = '<option value="all">All Years</option>';
  
  sortedYears.forEach(y => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    sel.appendChild(opt);
  });

  // Listen for changes
  sel.onchange = window.updateDashboard;
}

window.updateDashboard = function() {
  const ySel = document.getElementById("yearSelect");
  const selectedYear = ySel ? ySel.value : "all";

  // 1. Filter ST.data (which is already code-filtered) by Year
  window.ST.filtered = window.ST.data.filter(r => {
    // Check Year (if selected)
    if (selectedYear !== "all") {
      const d = r.dateParsed;
      if (isNaN(d) || String(d.getFullYear()) !== selectedYear) return false;
    }
    return true;
  });

  // 2. Re-calculate available months based on this filtered set
  window.ST.months = [...new Set(window.ST.filtered.map(r => {
    const d = r.dateParsed;
    return isNaN(d) ? null : window.monthKey(d);
  }).filter(Boolean))].sort();

  // 3. Render Views
  if (typeof renderCurrent === 'function') renderCurrent(window.ST.filtered);
  if (typeof setupClub === 'function') setupClub(window.ST.filtered);
  if (typeof renderTopClubs === 'function') renderTopClubs();
}

// -------------------------------

// HELPER: Export CSV (Context Aware)
function exportCSV() {
  let dataToExport = [];
  let filename = "export.csv";

  // Check which tab is active
  const activeTab = document.querySelector(".tab-content.active");
  const tabId = activeTab ? activeTab.id : "current";

  if (tabId === "active") {
    // Export Partners
    if (!window.ST.partnersData || !window.ST.partnersData.length) {
      alert("No partner data available yet.");
      return;
    }
    dataToExport = window.ST.partnersData;
    filename = `partners_export_${new Date().toISOString().slice(0,10)}.csv`;
  } else {
    // Export Members (Overview/Club Insights)
    if (!window.ST.filtered || !window.ST.filtered.length) {
      alert("No member data available to export.");
      return;
    }
    dataToExport = window.ST.filtered;
    filename = `members_export_${new Date().toISOString().slice(0,10)}.csv`;
  }

  // Use PapaParse to unparse the dataset
  const csv = Papa.unparse(dataToExport);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  
  // Create download link
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
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
  else if (["current","clubInsights"].includes(tab) && window.ST.loaded) {
    // Use the filtered set
    if (typeof renderCurrent === 'function') renderCurrent(window.ST.filtered);
    // Trigger charts resize/render
    if (typeof resizeCharts === 'function') requestAnimationFrame(resizeCharts);
  }
}

function init() {
  // Restore theme
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    document.getElementById("themeToggle").textContent = "☀️ Light Mode";
  }

  document.getElementById("themeToggle").onclick = toggleTheme;

  if (typeof window.loadData === 'function') window.loadData();

  // Resize handling
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (typeof resizeCharts === 'function') resizeCharts();
    }, 100);
  });

  window.addEventListener("load", () => {
      if (typeof resizeCharts === 'function') resizeCharts();
  });
}

document.addEventListener("DOMContentLoaded", init);

/* --- Snow Logic --- */
function startSnow() {
  const createSnowflake = () => {
    const snowflake = document.createElement('div');
    snowflake.classList.add('snowflake');
    const size = Math.random() * 5 + 3 + 'px';
    snowflake.style.width = size;
    snowflake.style.height = size;
    snowflake.style.left = Math.random() * 100 + 'vw';
    const duration = Math.random() * 5 + 3 + 's';
    snowflake.style.animationDuration = duration;
    snowflake.style.opacity = Math.random() * 0.5 + 0.3;
    document.body.appendChild(snowflake);
    setTimeout(() => { snowflake.remove(); }, parseFloat(duration) * 1000);
  };
  setInterval(createSnowflake, 100);
}
window.addEventListener('load', startSnow);