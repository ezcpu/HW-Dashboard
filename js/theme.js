function toggleTheme() {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");

  document.getElementById("themeToggle").textContent =
    isDark ? "☀️ Light Mode" : "🌙 Dark Mode";

  rerender();
}

function resizeCharts() {
  // ApexCharts are responsive by default. 
  // If manual resize is strictly needed, we can trigger it here,
  // but removing the invalid Plotly call fixes the crash.
}

function rerender() {
  if (!ST.loaded) return;
  // Re-render active views to pick up new theme colors
  if(typeof renderCurrent === 'function') renderCurrent(ST.filtered);
  if(typeof renderClub === 'function') renderClub();
  if(typeof renderTopClubs === 'function') renderTopClubs(ST.filtered);
}