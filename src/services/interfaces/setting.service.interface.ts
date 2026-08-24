export interface ISettingService {
  getAllowedEmailDomains(): Promise<string[]>;
  setAllowedEmailDomains(domains: string[]): Promise<string[]>;
}
