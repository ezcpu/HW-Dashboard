function renderPartners() {
  if (ST.partnersLoaded) return;

  const statusEl = document
    .getElementById("activeStatus")
    .querySelector("span:last-child");

  const listEl = document.getElementById("partnersList");
  statusEl.textContent = "Loading...";

  Papa.parse(CFG.PARTNERS, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: r => {
      const rows = r.data || [];
      if (!rows.length) {
        statusEl.textContent = "No partners found";
        return;
      }

      const clean = rows.map(row => {
        const o = {};
        for (const k in row) o[k.trim().toLowerCase()] = (row[k] || "").trim();
        return o;
      });

      const partners = clean.map(r => {
        const name = r["company name"] || r["company"] || "Unknown";
        let region = r["region"] || "Unknown";
        region = region
          .replace(/east canada|eastern canada/i,"East")
          .replace(/west canada|western canada/i,"West")
          .replace(/canada/i,"Canada");

        const promo = r["promotion type"] || r["promotion"] || "";
        const payment =
          r["payment arrangement"] ||
          r["payment arrangements"] ||
          r["payment"] ||
          r["payment type"] ||
          r["paymentarrangement"] ||
          r["paymentarrangements"] ||
          r["paymenttype"] ||
          r["employee reimbursement"] ||
          r["company paid"] ||
          r["employee paid"] ||
          "";

        const docsLink =
          r["supporting documents (urls)"] ||
          r["supporting documents"] ||
          r["supporting document"] ||
          r["documents"] ||
          r["document link"] ||
          r["link"] ||
          "";

        return { name, region, promo, payment, docsLink };
      });

      if (!partners.length) {
        statusEl.textContent = "No partners found";
        return;
      }

      partners.sort((a, b) => a.name.localeCompare(b.name));

      const badgeClass = payment => {
        const p = payment.toLowerCase();
        if (p.includes("employee paid")) return "badge payment-employee-paid";
        if (p.includes("employee reimbursement"))
          return "badge payment-employee-reimb";
        if (p.includes("company paid")) return "badge payment-company-paid";
        return "badge payment";
      };

      listEl.innerHTML = partners
        .map(
          p => `
          <li>
            <span class="badge ${p.region === "Canada" ? "can" : "us"}">${p.region}</span>
            <span class="name">${p.name}</span>
            <span class="meta">
              ${
                p.payment
                  ? `<span class="${badgeClass(p.payment)}">${p.payment}</span>`
                  : ""
              }
              ${
                p.docsLink
                  ? `<a href="${p.docsLink}" target="_blank" rel="noopener noreferrer">📄 Flyer</a>`
                  : ""
              }
            </span>
          </li>`
        )
        .join("");

      // REGIONAL CHART
      const pCounts = partners.reduce((acc, p) => {
        acc[p.region] = (acc[p.region] || 0) + 1;
        return acc;
      }, {});

      const sorted = Object.entries(pCounts).sort((a,b)=>b[1]-a[1]);
      const palette = pal();

      Plotly.newPlot("partnersByRegion", [{
        x: sorted.map(k => k[0]),
        y: sorted.map(k => k[1]),
        type:"bar",
        marker:{color: sorted.map(k => 
          k[0]==="Canada" ? palette.can : 
          k[0]==="East" ? palette.us :
          palette.accent )
        },
        text: sorted.map(k => k[1]),
        textposition:"auto"
      }], {
        ...lay("Partners","Region"),
        height:300,
        margin:{t:10,l:50,r:10,b:50}
      }, pcfg);

      // PAYMENT TYPE COUNT CHART
      const payCounts = {};
      partners.forEach(p => {
        if (p.payment) payCounts[p.payment] = (payCounts[p.payment] || 0) + 1;
      });

      const paySorted = Object.entries(payCounts).sort((a,b)=>b[1]-a[1]);

      const payColor = type => {
        const t = type.toLowerCase();
        // Updated colors to match CSS variables
        if (t.includes("employee paid")) return "#3b82f6"; // var(--primary)
        if (t.includes("employee reimbursement")) return "#f59e0b"; // var(--warn)
        if (t.includes("company paid")) return "#10b981"; // var(--accent)
        return palette.accent;
      };

      if (paySorted.length > 0) {
        Plotly.newPlot("paymentByRegion", [{
          x: paySorted.map(p => p[0]),
          y: paySorted.map(p => p[1]),
          type:"bar",
          marker:{color: paySorted.map(p => payColor(p[0]))},
          text: paySorted.map(p => p[1]),
          textposition:"inside",
          textfont:{color:"white",size:14}
        }], {
          ...lay("Partners","Payment Type"),
          height:300,
          margin:{t:10,l:50,r:10,b:100}
        }, pcfg);
      } else {
        document.getElementById("paymentByRegion").innerHTML =
          '<div class="empty-state"><div class="empty-state-icon">💳</div><p>No payment arrangement data</p></div>';
      }

      statusEl.textContent = `${partners.length} partners`;
      ST.partnersLoaded = true;
      requestAnimationFrame(resizeCharts);
    },

    error: e => {
      console.error("Partners error:", e);
      statusEl.textContent = "Failed to load";
    }
  });
}
