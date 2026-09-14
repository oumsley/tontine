import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { NavKey } from "@/components";
import { MainStackParamList } from "@/navigation/MainNavigator";

const ROUTE_BY_KEY: Record<NavKey, keyof MainStackParamList> = {
  home: "Home",
  profile: "Profile",
};

export function useMainNav(navigation: NativeStackNavigationProp<MainStackParamList, keyof MainStackParamList>) {
  return (key: NavKey) => navigation.navigate(ROUTE_BY_KEY[key] as never);
}
