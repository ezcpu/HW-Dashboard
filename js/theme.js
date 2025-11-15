function toggleTheme() {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");

  document.getElementById("themeToggle").textContent =
    isDark ? "☀️ Light Mode" : "🌙 Dark Mode";

  rerender();
  requestAnimationFrame(resizeCharts);
}

function resizeCharts() {
  const ids = [
    "regionTotalChart","regionBCChart","region10NRChart",
    "impactUS","impactCAN","promoChart",
    "clubRegionDonut","clubUsage","clubTrend",
    "topClubsChart","partnersByRegion","paymentByRegion"
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.data) {
      try { Plotly.Plots.resize(el); }
      catch(e) { console.warn("Failed to resize chart:", id, e); }
    }
  });
}

function rerender() {
  if (!ST.loaded) return;
  renderCurrent(ST.filtered);
  renderClub();
  renderTopClubs();
  setTimeout(resizeCharts, 100);
}
