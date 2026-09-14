import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { AuthTokens } from "@bingmoney/shared";

const ACCESS_KEY = "bingmoney.accessToken";
const REFRESH_KEY = "bingmoney.refreshToken";

// expo-secure-store wraps the OS Keychain/Keystore and has no web
// implementation. Web only serves as an unauthenticated preview target in
// this project (see apps/mobile README), so it falls back to localStorage;
// real devices always use the secure native store.
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

export const tokenStore = {
  async save(tokens: AuthTokens): Promise<void> {
    await storage.setItemAsync(ACCESS_KEY, tokens.accessToken);
    await storage.setItemAsync(REFRESH_KEY, tokens.refreshToken);
  },
  async getAccessToken(): Promise<string | null> {
    return storage.getItemAsync(ACCESS_KEY);
  },
  async getRefreshToken(): Promise<string | null> {
    return storage.getItemAsync(REFRESH_KEY);
  },
  async clear(): Promise<void> {
    await storage.deleteItemAsync(ACCESS_KEY);
    await storage.deleteItemAsync(REFRESH_KEY);
  },
};
