import type {AppEnv} from './environment';
import {stripeEntitled} from './features/stripe';
export const billingProviders:Record<string,(env:AppEnv['Bindings'],userId:string)=>Promise<boolean>>={stripe:stripeEntitled};
