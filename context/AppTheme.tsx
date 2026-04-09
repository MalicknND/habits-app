import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

const STORAGE_KEY = "@habits/theme_preference";

export type ThemePreference = "system" | "light" | "dark";

export type ResolvedScheme = "light" | "dark";

async function loadPreference(): Promise<ThemePreference> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") {
    return raw;
  }
  return "system";
}

async function persistPreference(value: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, value);
}

type AppThemeContextValue = {
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => Promise<void>;
  resolvedScheme: ResolvedScheme;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    void loadPreference().then(setPreferenceState);
  }, []);

  const setPreference = useCallback(async (value: ThemePreference) => {
    setPreferenceState(value);
    await persistPreference(value);
  }, []);

  const resolvedScheme: ResolvedScheme = useMemo(() => {
    if (preference === "light") return "light";
    if (preference === "dark") return "dark";
    return systemScheme === "dark" ? "dark" : "light";
  }, [preference, systemScheme]);

  const value = useMemo(
    () => ({ preference, setPreference, resolvedScheme }),
    [preference, setPreference, resolvedScheme],
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme(): AppThemeContextValue {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return ctx;
}
