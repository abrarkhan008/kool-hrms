import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { EMPTY_STATE, DEFAULT_SETTINGS } from "./defaults.js";
import { LOGOS } from "./logos.js";

/**
 * ALL data lives in this browser (localStorage) - there is no backend.
 * Later you can replace load() / save() with calls to Supabase / Firebase and nothing else changes.
 */
const KEY = "kool_hrms_v1";

const load = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_STATE(true);
    const s = JSON.parse(raw);
    // merge so newly added settings never break old saved data
    return {
      ...EMPTY_STATE(false),
      ...s,
      settings: {
        ...s.settings,
        company: { ...DEFAULT_SETTINGS.company, ...s.settings?.company },
        timing: { ...DEFAULT_SETTINGS.timing, ...s.settings?.timing },
        leave: { ...DEFAULT_SETTINGS.leave, ...s.settings?.leave },
        salary: {
          ...DEFAULT_SETTINGS.salary,
          ...s.settings?.salary,
          kpiSlabs: {
            ...DEFAULT_SETTINGS.salary.kpiSlabs,
            ...s.settings?.salary?.kpiSlabs,
          },
        },
        holidays: s.settings?.holidays || [],
        admin: { ...DEFAULT_SETTINGS.admin, ...s.settings?.admin },
      },
    };
  } catch {
    return EMPTY_STATE(true);
  }
};
const withLogos = (st) => ({
  ...st,
  settings: { ...st.settings, company: { ...st.settings.company, ...LOGOS } },
});

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [state, setState] = useState(() => withLogos(load()));
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("kool_session"));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Could not save", e);
    }
  }, [state]);

  const login = useCallback((s) => {
    setSession(s);
    sessionStorage.setItem("kool_session", JSON.stringify(s));
  }, []);
  const logout = useCallback(() => {
    setSession(null);
    sessionStorage.removeItem("kool_session");
  }, []);

  const api = useMemo(
    () => ({
      state,
      session,
      login,
      logout,
      update: (fn) => setState((s) => fn(structuredClone(s))),
      setSettings: (patch) =>
        setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      resetAll: (withDemo) => setState(EMPTY_STATE(withDemo)),
      replaceAll: (data) => setState({ ...EMPTY_STATE(false), ...data }),
    }),
    [state, session, login, logout],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
