# Resources: HF single-station location over India

Collected 19 Nov 2026 from web searches. "Verified" = I opened the page or abstract. Others came from search snippets; check before citing.

## 1. The problem statement (DRDO)
| Resource | What it gives | Link |
|---|---|---|
| DIA-CoE Research Problems, Mar 2026 (verified via search excerpt) | Item 16: "Single Station Location Algorithm for HF DF using Azimuth Bearing, Elevation Bearing and Ionospheric Model Software", Electronic Warfare, lab DLRL. Figure of merit: SSL accuracy. | https://iitk.ac.in/dord/diacoe/data/Research_Problems_for_DIA-CoEs-Mar-2026.pdf |
| DIA-CoE Research Problems, Sep 2026 | Same problem as item 10. **Call open 25 Sep – 31 Dec 2026.** | https://iitk.ac.in/dord/diacoe/data/Research-Problems-for-DIA-CoEs-Sep-2026.pdf |
| Earlier lists (Feb 2025, Jun 2025, Oct 2024) | Background on other EW problems | https://iitk.ac.in/dord/diacoe/data/Research_Problems_for_DIA-CoEs-Feb-2025.pdf |

## 2. Single-station location (SSL) literature
| Resource | Why it matters | Link |
|---|---|---|
| Li et al. 2026, arXiv:2610.13560 (verified) | Multimode ray tracing + time-frequency fusion; 0.78–3.41% relative error on 3 measured links. The current state of the art; not at Indian latitudes. | https://arxiv.org/abs/2610.13560 |
| NRL report (DTIC ADA133208) | Ionospheric model error as a main systematic SSL error; tilts bias the azimuth. | https://apps.dtic.mil/sti/pdfs/ADA133208.pdf |
| DTIC ADA264667 | Further SSL analysis | https://apps.dtic.mil/sti/pdfs/ADA264667.pdf |
| Quality factor for single-site location (Univ. Pretoria, 2016) | Grades SSL fixes by comparing measured elevation with IRI ray-traced modes. A good model for our fix-quality pill. | https://repository.up.ac.za/handle/2263/56632 |
| Coetzee PhD thesis, Univ. Pretoria, 2018 | Interferometric DF + ray tracing for SSL; ground constants, wave tilt. | https://repository.up.ac.za/handle/2263/70554 · PDF: https://core.ac.uk/download/528282445.pdf |
| Huang & Reinisch 2006, real-time HF ray tracing through a tilted ionosphere | Digisonde-measured tilt to correct ray tracing | (search title) |
| Roke SSL datasheet | A commercial SSL using reciprocal ray tracing and IRI-2020, multi-hop, confidence intervals. Shows the industry approach (no accuracy figures given). | https://roke.co.uk/media/mmkpxuki/ssl-datasheet.pdf |
| Erhel & Marie, MILCOM 2007; arXiv 2026 SSL work | Named in the project brief, not re-verified here | — |

## 3. EIA and the Indian ionosphere
| Resource | Key point | Link |
|---|---|---|
| Pavan Chaitanya et al. 2015, Ann. Geophys. 33, 997 (verified) | IRI-2012 **overestimates** foF2 at Indian low-latitude stations, worst at noon (noon bite-out). foF2 saturates above F10.7 ≈ 120. | https://angeo.copernicus.org/articles/33/997/2015/ |
| Jayachandran et al. 1997, Ann. Geophys. 15, 255 | 4-station Indian ionosonde chain, equator to crest (Ahmedabad); crest location matters. | https://angeo.copernicus.org/articles/15/255/1997/ |
| Chandra, Sharma & Aung 2009, J. Ind. Geophys. Union 13(4) | foF2 variability at Ahmedabad (near the crest); link to electrojet strength. | https://iguonline.in/journal/Archives/13-4/24harish.pdf |
| Yadav et al. 2013 | 7 Indian ionosondes; Gaussian fits for crest latitude and crest foF2 vs solar activity. Useful for calibrating `getIono`. | (search title) |
| Dabas et al. 2006, Ann. Geophys. 24, 97 | Severe storms: F-region heights up 200–300 km at the equator and low latitudes; EIA expansion. | https://angeo.copernicus.org/articles/24/97/2006/ |
| IIG repository | Storm-time electric fields along the Indian longitude (e.g. June 2015) | https://repository.iigm.res.in/ |
| Studies of IRI vs Indian stations (Varanasi, New Delhi, equator) | hmF2 underestimation at the equator, foF2 overestimation | https://angeo.copernicus.org/articles/29/1861/2011/angeo-29-1861-2011.pdf |

## 4. Software and models
| Tool | Use in this project | Link |
|---|---|---|
| PHaRLAP (DST Group, M. Cervera) | Numerical 2D/3D HF ray tracing (milestone 3) | https://www.dst.defence.gov.au/opportunity/pharlap-provision-high-frequency-raytracing-laboratory-propagation-studies |
| PyLap | Python interface to PHaRLAP (no MATLAB needed) | https://hamsci.org/publications/pylap-open-source-python-interface-pharlap-ionospheric-raytracing-toolkit |
| PyIRI (Forsythe et al., Space Weather 2024) | Fast whole-globe IRI in pure Python; `pip install PyIRI` (milestone 2 grids) | https://pyiri.readthedocs.io/ · https://pypi.org/project/PyIRI/ |
| iri2020 (space-physics) | Python wrapper around the Fortran IRI-2020 | https://github.com/space-physics/iri2020 |
| NICT HF-START | Public web HF ray-path simulator (Japan focus). A design reference and comparison point. | https://hfstart.nict.go.jp/readme_e.html |
| IGRF | Real magnetic field for magnetic latitude (replace the dipole) | https://www.ncei.noaa.gov/products/international-geomagnetic-reference-field |

## 5. Indian measurement data (for validation, milestone 3)
| Source | What | Link |
|---|---|---|
| GIRO / DIDBase (Lowell) | Digisonde data, incl. **Trivandrum TM308** | https://giro.uml.edu/ |
| SPL, VSSC (Thiruvananthapuram) metadata | Ionosonde and magnetometer data, equatorial F-region irregularities | https://www.spl.gov.in/SPLv2/index.php/spl-metadata.html |
| Indian ionosonde sites in the literature | Ahmedabad (crest), Tirunelveli (equator), Waltair, Kodaikanal, Sriharikota, Varanasi, Delhi | see section 3 |
| GNSS / NavIC TEC | Not found in this search. Next step: ISRO NavIC and GAGAN documentation, the IGS network and the Indian GNSS networks. | — |

## 6. Gaps found
- No open study of SSL accuracy under Indian EIA conditions (the paper's gap).
- No public inverse SSL tool for India (HF-START and PHaRLAP are forward tools).
- Tirunelveli ionosonde and NavIC TEC data access routes still need to be found.
