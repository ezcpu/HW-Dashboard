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

