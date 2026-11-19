// Controls panel. Basics are always visible; everything else sits in collapsed sections.
const ex = '<span class="ex" title="Example coordinates, not a real site">example</span>';

export const INTRO = {
  forward: "<strong>Forward.</strong> A radio sends a signal that bounces off the ionosphere to our station. Each method then tries to work out where the radio is.",
  inverse: "<strong>Inverse.</strong> Type in what the station measured. Each method traces the signal back and guesses where the radio is.",
  storm: "<strong>Quiet vs storm.</strong> Move the storm slider and watch the standard method drift off target.",
  compare: "<strong>India vs Europe.</strong> The same signal path, placed in India and in Europe. Over India the standard method goes wrong.",
};

// One-click scenarios (all examples). Numbers checked against physics.js.
export const PRESETS = [
  { id: "quiet", label: "Quiet afternoon", hint: "a normal day", set: { tx: { lat: 15.5, lon: 88.5 }, f: 7.2, ist: "14:30", storm: 0, hopPref: 0 } },
  { id: "storm", label: "Storm afternoon", hint: "much worse", set: { tx: { lat: 15.5, lon: 88.5 }, f: 7.2, ist: "14:30", storm: 0.8, hopPref: 0 } },
  { id: "morning", label: "Morning 09:30", hint: "before the bulge forms", set: { tx: { lat: 15.5, lon: 88.5 }, f: 7.2, ist: "09:30", storm: 0, hopPref: 0 } },
  { id: "twohop", label: "Long path", hint: "two bounces", set: { tx: { lat: 9.0, lon: 98.5 }, f: 7.2, ist: "14:30", storm: 0, hopPref: 2 } },
];

export function controlsHTML() {
  return `
  <div class="presets" role="group" aria-label="Example scenarios">
    <p class="presets__h">Try a scenario <span class="ex">example</span></p>
    <div class="presets__row">
      ${PRESETS.map((p) => `<button type="button" class="chip" data-preset="${p.id}" aria-pressed="false"><b>${p.label}</b><span>${p.hint}</span></button>`).join("")}
    </div>
  </div>

  <fieldset data-views="forward storm compare">
    <legend><span class="dot" style="background:var(--coral)"></span>Radio (transmitter) ${ex}</legend>
    <div class="row">
      <label class="f"><span>Latitude °N</span><input type="number" id="tx-lat" step="0.01" min="-89" max="89"></label>
      <label class="f"><span>Longitude °E</span><input type="number" id="tx-lon" step="0.01" min="-180" max="180"></label>
    </div>
  </fieldset>

  <fieldset data-views="forward inverse storm compare">
    <legend><span class="dot" style="background:var(--cyan)"></span>Our station ${ex}</legend>
    <div class="row">
      <label class="f"><span>Latitude °N</span><input type="number" id="st-lat" step="0.01" min="-89" max="89"></label>
      <label class="f"><span>Longitude °E</span><input type="number" id="st-lon" step="0.01" min="-180" max="180"></label>
    </div>
  </fieldset>

  <fieldset data-views="inverse">
    <legend><span class="dot" style="background:var(--amber)"></span>What the station measured</legend>
    <div class="row">
      <label class="f"><span>Direction (azimuth °)</span><input type="number" id="az" step="0.1" min="0" max="360"></label>
      <label class="f"><span>Steepness (elevation °)</span><input type="number" id="el" step="0.1" min="1" max="85"></label>
    </div>
    <label class="f"><span>Bounces assumed</span>
      <select id="inv-hops"><option value="1">1 bounce</option><option value="2">2 bounces</option><option value="3">3 bounces</option></select></label>
    <div class="btns"><button type="button" class="btn btn--sm btn--amber" id="copy-fw">Use the example's angles</button></div>
  </fieldset>

  <fieldset data-views="forward inverse storm compare" class="fs-time">
    <legend>Signal and time</legend>
    <label class="f"><span>Frequency <output id="f-out"></output></span><input type="range" id="f" min="3" max="30" step="0.1"></label>
    <label class="f"><span>Time (IST)</span><input type="time" id="ist" step="900"></label>
    <label class="f"><span>Storm level <output id="storm-out"></output></span><input type="range" id="storm" min="0" max="1" step="0.05"></label>
  </fieldset>

  <details class="adv" data-views="forward inverse storm compare">
    <summary>More settings</summary>
    <label class="f"><span>Date (sets the season)</span><input type="date" id="date"></label>
    <p class="hint" id="ut-hint"></p>
    <label class="f"><span>Solar activity F10.7 <output id="f107-out"></output></span><input type="range" id="f107" min="70" max="250" step="1"></label>
    <label class="f"><span>Ionosphere ("truth")</span>
      <select id="source"><option value="iri">IRI monthly median (PyIRI)</option><option value="v1">v1 illustrative model</option></select></label>
    <p class="hint" id="source-hint"></p>
    <label class="f" data-views="forward storm compare"><span>Bounces</span>
      <select id="hops"><option value="0">Auto (fewest that work)</option><option value="1">1 bounce</option><option value="2">2 bounces</option><option value="3">3 bounces</option></select></label>
  </details>

  <details class="adv" data-views="forward inverse storm compare">
    <summary>DF accuracy <output id="angErr-sum"></output></summary>
    <label class="f"><span>Angle error σ <output id="angErr-out"></output></span><input type="range" id="angErr" min="0.25" max="3" step="0.25"></label>
    <p class="hint">Plus foF2 ±7% and hmF2 ±15 km model uncertainty. 240 Monte Carlo runs per ellipse.</p>
  </details>

  <details class="adv" data-views="forward inverse storm compare">
    <summary><span class="dot" style="background:var(--violet)"></span>Display</summary>
    <label class="f"><span>Globe</span>
      <select id="globe-style"><option value="satellite">Satellite (NASA Blue Marble)</option><option value="schematic">Schematic (coastlines)</option></select></label>
    <label class="f"><span>Height exaggeration <output id="exag-out"></output></span><input type="range" class="violet" id="exag" min="1" max="20" step="1"></label>
    <label class="f"><span>Ionosphere shell shows</span>
      <select id="shell"><option value="india">India-aware model</option><option value="standard">Standard model</option></select></label>
    <label class="chk"><input type="checkbox" id="show-iono" checked> Ionosphere shell</label>
    <label class="chk"><input type="checkbox" id="show-cloud" checked> Monte Carlo points</label>
    <label class="chk"><input type="checkbox" id="show-mag" checked> Magnetic equator and crest lines</label>
  </details>

  <div class="btns">
    <button type="button" class="btn" id="reset">Reset example</button>
    <button type="button" class="btn" id="fly-india">Centre on India</button>
  </div>`;
}

// show / hide elements tagged with data-views for the current view
export function applyView(root, view) {
  root.querySelectorAll("[data-views]").forEach((el) => {
    el.hidden = !el.getAttribute("data-views").split(" ").includes(view);
  });
}
