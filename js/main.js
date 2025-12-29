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
  // Reset Month
  const mSelect = document.getElementById("monthSelect");
  if(mSelect) mSelect.value = "all";

  // Reset Club Checkboxes
  const container = document.getElementById("clubCheckboxes");
  if (container) {
    const inputs = container.querySelectorAll("input");
    inputs.forEach(inp => {
      // Check "__ALL__", uncheck everything else
      inp.checked = (inp.value === "__ALL__");
    });
    // Update the label text (e.g., "All Clubs")
    if (typeof updateClubLabel === 'function') updateClubLabel();
  }
  
  // Re-trigger render logic
  if (typeof renderClub === 'function') renderClub();
}
// HELPER: Export CSV (Context Aware)
function exportCSV() {
  let dataToExport = [];
  let filename = "export.csv";

  // Check which tab is active
  const activeTab = document.querySelector(".tab-content.active");
  const tabId = activeTab ? activeTab.id : "current";

  if (tabId === "active") {
    // Export Partners
    if (!ST.partnersData || !ST.partnersData.length) {
      alert("No partner data available yet.");
      return;
    }
    dataToExport = ST.partnersData;
    filename = `partners_export_${new Date().toISOString().slice(0,10)}.csv`;
  } else {
    // Export Members (Overview/Club Insights)
    if (!ST.filtered || !ST.filtered.length) {
      alert("No member data available to export.");
      return;
    }
    dataToExport = ST.filtered;
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

/* --- Snow Logic --- */
function startSnow() {
  const createSnowflake = () => {
    const snowflake = document.createElement('div');
    snowflake.classList.add('snowflake');
    
    // Randomize size (between 3px and 8px)
    const size = Math.random() * 5 + 3 + 'px';
    snowflake.style.width = size;
    snowflake.style.height = size;
    
    // Randomize starting position (horizontal)
    snowflake.style.left = Math.random() * 100 + 'vw';
    
    // Randomize fall speed (between 3s and 8s)
    const duration = Math.random() * 5 + 3 + 's';
    snowflake.style.animationDuration = duration;
    
    // Randomize opacity slightly for depth
    snowflake.style.opacity = Math.random() * 0.5 + 0.3;

    document.body.appendChild(snowflake);
    
    // Remove snowflake after it falls to keep memory usage low
    setTimeout(() => {
      snowflake.remove();
    }, parseFloat(duration) * 1000);
  };

  // Create a new snowflake every 100ms
  setInterval(createSnowflake, 100);
}

// Start the snow once the page loads
window.addEventListener('load', startSnow);
