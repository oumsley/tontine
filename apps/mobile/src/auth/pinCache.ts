import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const BIOMETRICS_ENABLED_KEY = "bingmoney.biometricsEnabled";
const PIN_CACHE_KEY = "bingmoney.pinCache";

// Same web fallback rationale as tokenStore.ts: expo-secure-store has no
// web implementation, and web is only an unauthenticated preview target
// here (see apps/mobile README).
const webStorage = {
  setItemAsync: async (key: string, value: string) => {
    globalThis.localStorage?.setItem(key, value);
  },
  getItemAsync: async (key: string) => globalThis.localStorage?.getItem(key) ?? null,
  deleteItemAsync: async (key: string) => {
    globalThis.localStorage?.removeItem(key);
  },
};

const storage = Platform.OS === "web" ? webStorage : SecureStore;

// The PIN is cached in the OS Keychain/Keystore only so a biometric
// confirmation can stand in for retyping it at each sensitive wallet
// action; the server always re-verifies it, biometrics never bypass that.
export const pinCache = {
  async setBiometricsEnabled(enabled: boolean): Promise<void> {
    await storage.setItemAsync(BIOMETRICS_ENABLED_KEY, enabled ? "true" : "false");
  },
  async isBiometricsEnabled(): Promise<boolean> {
    return (await storage.getItemAsync(BIOMETRICS_ENABLED_KEY)) === "true";
  },
  async savePin(pin: string): Promise<void> {
    await storage.setItemAsync(PIN_CACHE_KEY, pin);
  },
  async getPin(): Promise<string | null> {
    return storage.getItemAsync(PIN_CACHE_KEY);
  },
  async clear(): Promise<void> {
    await storage.deleteItemAsync(BIOMETRICS_ENABLED_KEY);
    await storage.deleteItemAsync(PIN_CACHE_KEY);
  },
};
