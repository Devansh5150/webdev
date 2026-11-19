// Milestone 2 study: errors of the standard and v1 India models when the truth is IRI (PyIRI grids).
// Run from the repo root:  node research/m2_iri_study.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createIriSampler } from "../web/src/iri.js";
import { forward, locate, distBearing, MODELS, runScenario, getIono } from "../web/src/physics.js";
const D=fileURLToPath(new URL("../web/public/data/iri/", import.meta.url));
const meta=JSON.parse(readFileSync(D+"meta.json","utf8"));
const S=(m)=>{const b=readFileSync(D+meta.files[m]);return createIriSampler(meta,new Uint16Array(b.buffer,b.byteOffset,b.byteLength/2),m);};
const ST={lat:21.15,lon:79.09}, TX={lat:15.5,lon:88.5};
// estimators against IRI truth: standard (v1 no EIA), v1 India-adjusted (no grid, independent of IRI), IRI itself (circular upper bound)
function errs(grid, utHours, storm, tx=TX, f=7.2, hops=0) {
  const base={utHours,f107:140,storm};
  const truth={...MODELS.truth(base),grid};
  const fw=forward(tx,ST,f,truth,hops); if(!fw.ok) return null;
  const est={standard:MODELS.standard(base), v1india:MODELS.india(base), iri:{...MODELS.india(base),grid}};
  const o={el:fw.el,h:fw.h};
  for(const[k,opts] of Object.entries(est)){const p=locate(ST,fw.az,fw.el,f,opts,fw.hops); o[k]=p?distBearing(p.lat,p.lon,tx.lat,tx.lon).d:null;}
  return o;
}
const fmt=(v)=>v==null?"  -  ":v.toFixed(0).padStart(5);
console.log("Example path, 14:30 IST, F10.7 140, truth = IRI(+storm,+TID)");
console.log("month storm |   el    h' | standard  v1-India   IRI");
for (const m of [1,3,6,9,10,12]) for (const storm of [0,1]) {const r=errs(S(m),9,storm); console.log(`  ${String(m).padStart(2)}    ${storm}   | ${r?r.el.toFixed(1).padStart(5):"  -  "} ${r?r.h.toFixed(0).padStart(5):"  -  "} | ${fmt(r?.standard)}    ${fmt(r?.v1india)}   ${fmt(r?.iri)}`);}
// diurnal, March
console.log("\nMarch, quiet: IST -> standard / v1-India / IRI");
for (let ist=8; ist<=22; ist+=2){const r=errs(S(3),(ist-5.5+24)%24,0); console.log(`  ${String(ist).padStart(2)}:00  ${fmt(r?.standard)} ${fmt(r?.v1india)} ${fmt(r?.iri)}`);}
// map statistics over India, March 14:30, 1 hop, point estimates: availability + error where a fix exists
import { muf } from "../web/src/physics.js";
const g=S(3), base={utHours:9,f107:140,storm:0}, truth={...MODELS.truth(base),grid:g};
for (const mode of ["0.8xMUF","7.2MHz"]) {
  const acc={standard:[],v1india:[],iri:[]}; let cells=0;
  for(let lat=4;lat<36;lat+=2)for(let lon=66;lon<98;lon+=2){const tx={lat:lat+1,lon:lon+1}; if(distBearing(ST.lat,ST.lon,tx.lat,tx.lon).d<500)continue;
    const f = mode==="7.2MHz" ? 7.2 : (()=>{const mu=muf(tx,ST,truth,1); return mu?0.8*mu:null;})(); if(!f) continue;
    const r=errs(g,9,0,tx,f,1); if(!r) continue; cells++; for(const k in acc) if(r[k]!=null) acc[k].push(r[k]);}
  const med=a=>a.length?a.slice().sort((x,y)=>x-y)[a.length>>1].toFixed(0)+" km":"n/a", good=a=>a.length?(a.filter(x=>x<50).length/a.length*100).toFixed(0)+"%":"n/a";
  console.log(`
Map over India, ${mode} (March 14:30 IST, quiet, 2 deg, 1 hop): ${cells} cells with a real path`);
  for(const k in acc) console.log(`  ${k.padEnd(9)} fix available ${(acc[k].length/cells*100).toFixed(0).padStart(3)}%   median error ${med(acc[k])}   good(<50 km) ${good(acc[k])}`);
}
// control point comparison
const c={lat:18.38,lon:83.87}; for(const [n,o] of [["IRI",{...MODELS.india(base),grid:g}],["v1-India",MODELS.india(base)],["standard",MODELS.standard(base)]]){const io=getIono(c.lat,c.lon,o); console.log(`  control pt ${n.padEnd(9)} foF2=${io.foF2.toFixed(2)} hmF2=${io.hmF2.toFixed(0)} ym=${io.ym.toFixed(0)}`);}
