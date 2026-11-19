import { useEffect, useState } from "react";
import { loadProfiles, type Profile } from "../engine/iriProfiles";
import { BASE_URL } from "../services/analysisService";
import { monthOf } from "../utils/scientificCalculations";

export function useProfile(lat: number, lon: number, utHours: number, f107: number, date: string): { profile: Profile | null; error: string | null } {
  const [state, setState] = useState<{ profile: Profile | null; error: string | null }>({ profile: null, error: null });
  useEffect(() => {
    let live = true;
    loadProfiles(monthOf(date), BASE_URL)
      .then((s) => { if (live) setState({ profile: s(lat, lon, utHours, f107), error: null }); })
      .catch((e) => { if (live) setState({ profile: null, error: String(e) }); });
    return () => { live = false; };
  }, [lat, lon, utHours, f107, date]);
  return state;
}
