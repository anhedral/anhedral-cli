export type UiPlatform = 'web' | 'ios' | 'android';
export interface UiInspectionOptions {
  app?: string;
  platform?: UiPlatform;
}
export interface UiConsumerDescriptor {
  workspace: string;
  profile: 'expo' | 'next' | 'vinext';
  uiPackage: {
    root: string;
    importNamespace: string;
    buttonExport: string;
    buttonTargets: Partial<Record<UiPlatform, string>>;
  } | null;
  supportedPlatforms: UiPlatform[];
  platform: UiPlatform | null;
  sourceRecipeVersion: null;
  portableContractVersion: null;
}
export interface UiConsumerResolution {
  state: 'resolved' | 'ambiguous' | 'unsupported' | 'invalid' | 'migration-required';
  consumers: UiConsumerDescriptor[];
  consumer: UiConsumerDescriptor | null;
  reason: string;
  eligibility: 'unavailable';
}
export interface UiCatalogEntry {
  selector: 'ui/button';
  kind: 'ui';
  sourceAvailability: 'candidate-unavailable';
  installable: false;
  sourceRecipeVersion: null;
  portableContractVersion: null;
}
