import { useEffect } from "react";
import { PAGES, useAnalysis, type Page } from "../store/analysisStore";

/** Keeps the active page in sync with the URL hash (#/analysis, #/reports, ...). */
export function useHashRoute() {
  const page = useAnalysis((s) => s.page);
  const setPage = useAnalysis((s) => s.setPage);
  useEffect(() => {
    console.log("DBG hash effect run " + location.hash);
    const read = () => {
      const p = location.hash.replace(/^#\/?/, "") as Page;
      if (PAGES.includes(p)) setPage(p);
      else history.replaceState(null, "", `#/${useAnalysis.getState().page}`);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [setPage]);
  useEffect(() => { if (location.hash !== `#/${page}`) history.pushState(null, "", `#/${page}`); }, [page]);
}
