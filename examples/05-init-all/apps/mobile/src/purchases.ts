import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';

// Pass the stable user ID returned by the authenticated API session.
export async function connectPurchases(userId: string) {
  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!userId || !apiKey) throw Error('A signed-in account and store SDK key are required');
  if (await Purchases.isConfigured()) await Purchases.logIn(userId);
  else Purchases.configure({ apiKey, appUserID: userId });
}
export const offerings = () => Purchases.getOfferings();
export const purchase = (item: PurchasesPackage) => Purchases.purchasePackage(item);
export const restore = () => Purchases.restorePurchases();
