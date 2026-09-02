export const RAT_CREDITS_ART = [
  "__QQ        __QQ",
  '(_)_"> J&C (_)_">',
  "_)          _)",
  "",
  "Dos ratas trabajaron aquí",
].join("\n");

const KONAMI_CODE = "up-up-down-down-left-right-left-right-b-a";

export const isKonamiCode = (value: unknown): boolean => value === KONAMI_CODE;

export const printRatCredits = (): void => {
  console.log(`\n${RAT_CREDITS_ART}\n`);
};
