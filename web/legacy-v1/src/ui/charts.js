// Small canvas chart: location error vs storm level for both models.
export function drawStormChart(canvas, levels, current) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const g = canvas.getContext("2d");
  g.scale(dpr, dpr);
  g.clearRect(0, 0, w, h);
  const pad = { l: 44, r: 12, t: 14, b: 30 };
  const vals = levels.flatMap((l) => [l.standard, l.india]).filter((v) => v != null);
  const ymax = niceMax(Math.max(20, ...vals));
  const X = (s) => pad.l + s * (w - pad.l - pad.r);
  const Y = (v) => h - pad.b - (v / ymax) * (h - pad.t - pad.b);

  g.font = "11px 'IBM Plex Mono', monospace";
  g.strokeStyle = "#1f2b45"; g.fillStyle = "#8d9bb5"; g.lineWidth = 1;
  for (let k = 0; k <= 4; k++) {
    const v = (ymax / 4) * k, y = Y(v);
    g.beginPath(); g.moveTo(pad.l, y); g.lineTo(w - pad.r, y); g.stroke();
    g.textAlign = "right"; g.fillText(String(Math.round(v)), pad.l - 6, y + 4);
  }
  g.textAlign = "center";
  for (let k = 0; k <= 4; k++) g.fillText((k / 4).toFixed(2), X(k / 4), h - pad.b + 16);
  g.save(); g.translate(11, (h - pad.b + pad.t) / 2); g.rotate(-Math.PI / 2); g.fillText("error (km)", 0, 0); g.restore();

  // fix-quality bands
  [[50, "#3ddc97"], [150, "#ff5d6c"]].forEach(([v, c]) => {
    if (v > ymax) return;
    g.setLineDash([3, 4]); g.strokeStyle = c + "88";
    g.beginPath(); g.moveTo(pad.l, Y(v)); g.lineTo(w - pad.r, Y(v)); g.stroke(); g.setLineDash([]);
  });

  // current storm marker
  g.strokeStyle = "#5f6d88"; g.beginPath(); g.moveTo(X(current), pad.t); g.lineTo(X(current), h - pad.b); g.stroke();

  for (const [key, color] of [["standard", "#9aa4b2"], ["india", "#ffb547"]]) {
    g.strokeStyle = color; g.lineWidth = 2; g.beginPath();
    let started = false;
    levels.forEach((l) => {
      if (l[key] == null) { started = false; return; }
      const x = X(l.storm), y = Y(Math.min(l[key], ymax));
      if (!started) { g.moveTo(x, y); started = true; } else g.lineTo(x, y);
    });
    g.stroke();
    g.fillStyle = color;
    levels.forEach((l) => { if (l[key] != null) { g.beginPath(); g.arc(X(l.storm), Y(Math.min(l[key], ymax)), 2.5, 0, Math.PI * 2); g.fill(); } });
  }
}

function niceMax(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v * 1.08) return m * p;
  return 10 * p;
}
