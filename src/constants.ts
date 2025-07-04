export const BRIDGE_ID = {
  BANK: 'bank',
  CORE: 'core',
  DIBC: 'dibc',
  STORAGE: 'storage',
  PROVISION: 'provision',
  PROVISION_SMART_WALLET: 'provisionWallet',
  VLOCALCHAIN: 'vlocalchain',
  VTRANSFER: 'vtransfer',
  WALLET: 'wallet',
} as const;
export const CAUSEWAY_DEFAULT_PAGE_SIZE = 100;
export const CAUSEWAY_MAXIMUM_PAGE_SIZE = 200;
export const EXTRACT_VAT_ID_REGEX = /^v([0-9]*)$/;
export const IS_NUMBER_REGEX = /^[0-9]+(.[0-9]*)?$/;
export const TAILWIND_MULTIPLIER = 4;
export const WALLET_SPEND_ACTION_MESSAGE =
  '/agoric.swingset.MsgWalletSpendAction';
export const ZCF_PREFIX_REGEX = /^zcf-b1-[^-]+-/;

export const MERMAID_CONTAINER_PADDING = 4 * TAILWIND_MULTIPLIER;
