
Data Sources — HF Single-Station Locator (India)

Almost everything this project needs is openly available. The one exception is real direction-finding (DF) measurements, which are not public; see "The gap" below for workarounds.

1. Ionosphere model: PyIRI
   What it is: a pure-Python implementation of the International Reference Ionosphere (IRI), considered the gold standard of empirical ionospheric models. It needs no Fortran libraries.
   What we use it for: replacing the simplified getIono() in physics.js. This is the main upgrade for milestone 2.
   Why it fits: it evaluates electron density and ionospheric parameters (foF2, hmF2, …) on a whole global grid for a whole day at once. That makes it ideal for precomputing India grids by month, hour and solar flux as JSON for the website.
   Also provides: magnetic coordinates derived from the IGRF (the standard model of Earth's magnetic field), replacing the rough magnetic-field approximation in physics.js.
   Install: pip install PyIRI
   Links: https://pypi.org/project/PyIRI/ · https://pyiri.readthedocs.io/ · https://github.com/victoriyaforsythe/pyiri
   Cite: Forsythe et al. (2024), Space Weather, https://doi.org/10.1029/2023SW003739
2. Ionosonde measurements over India: GIRO / DIDBase
   What it is: the Global Ionosphere Radio Observatory database. Ionosondes are radar-like instruments that measure the real foF2 and hmF2 above a station. The database holds 42+ million ionogram measurements from observatories in about 30 countries.
   What we use it for: checking how accurate IRI and the India-adjusted model are against real measurements.
   Indian station: Ahmedabad, code AH223.
   Quick access (Python): the digisondeindices package, e.g. didbase.get_indices(date, 'AH223'). See https://libraries.io/pypi/digisondeindices
   Full numeric data: SAO Explorer with a free read-only account. Request one from Prof. Bodo Reinisch (UMass Lowell).
   License: CC-BY-NC-SA 4.0 (non-commercial), and you must credit the station data provider. Follow the "Rules of the Road".
   Links: https://giro.uml.edu/didbase/ · https://giro.uml.edu/didbase/RulesOfTheRoad.html
   Cite in acknowledgements: http://spase.info/SMWG/Observatory/GIRO
3. Satellite electron-density profiles: COSMIC-2
   What it is: six satellites in low-inclination orbits. They provide thousands of radio occultation soundings per day, concentrated in low and middle latitudes, which makes them ideal for India.
   What we use it for: checking hmF2 and the shape of the equatorial ionization anomaly (EIA) over India, especially on storm days.
   Access: data is published daily by 02:00 UTC for the previous day, available from 1 Oct 2019 onwards.
   Data: https://data.cosmic.ucar.edu/gnss-ro/cosmic2/
   Map interface: https://app.maps.cosmic.ucar.edu
   Info: https://www.cosmic.ucar.edu/what-we-do/cosmic-2/data/
4. Real HF links with known endpoints: WSPR
   What it is: a worldwide network of amateur radio beacons and receivers. Each decoded "spot" proves an HF path existed between two known locations on a given band and time.
   What we use it for: testing the forward model. Did our model predict that a link to or from India was possible at that frequency and time?
   Size: about 6.6 billion spots from 2008 onwards.
   Access:
   Public SQL database: https://wspr.live
   Also: https://wspr.rocks
   Raw data: https://wsprnet.org
   Caution: some reports are faulty or misreported. Filter outliers (impossible distances, duplicate or inconsistent spots) before use.
5. Space-weather indices
   What they are: solar flux (F10.7) and geomagnetic activity (Kp, Ap).
   What we use them for: the inputs IRI and our storm model need for a given date.
   Sources:
   NOAA Space Weather Prediction Center: https://www.swpc.noaa.gov
   NASA OMNIWeb: https://omniweb.gsfc.nasa.gov
   GFZ Potsdam Kp index: https://kp.gfz-potsdam.de
6. Indian navigation-satellite (NavIC/GPS) TEC: partly available
   What it is: NARL Gadanki (Department of Space) runs a network of GNSS and NavIC receivers. It has studied equatorial and low-latitude ionospheric storms with NavIC since 2016.
   Access: not a simple public download. Request it from NARL or ISRO science groups, or use data published with papers.
   Why it matters: the strongest Indian dataset for the "India-adjusted" model, if access can be arranged.
   Reference: https://www.unoosa.org/documents/pdf/icg/2021/ICG15/28.pdf
   The gap: real DF angle measurements

No open dataset gives measured azimuth and elevation of real HF signals over India. Workarounds:

Simulate: use IRI, corrected with COSMIC-2 or ionosonde data, as the "truth" ionosphere. This is the current approach in the brief.
Validate paths: check path predictions against WSPR links with known endpoints.
Collect our own: a low-cost software-defined radio receiver on a known WSPR or broadcast signal can measure arrival angles. This would produce an original dataset and a strong contribution to the paper.
Data by milestone
Milestone	Data
2: real ionosphere	PyIRI; F10.7 and Kp indices
3: validation	GIRO Ahmedabad ionosonde; COSMIC-2 profiles; WSPR paths
4: India-adjusted model	IRI corrected with ionosonde and COSMIC-2 data; NavIC/GPS TEC if access is granted
Notes for implementation
Store downloaded raw data under /research/data/raw/ (git-ignored). Store processed grids under /research/data/processed/. Export website-ready JSON to /web/public/data/.
Record the source, date range, license and download date for every dataset in /research/data/README.md.
Credit GIRO, the individual station providers, UCAR/COSMIC, PyIRI and WSPR in the paper and in the website's "About" panel.
