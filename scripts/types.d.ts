type KernelDeliveryBringOutYourDead = [tag: 'bringOutYourDead'];

type KernelDeliveryChangeVatOptions = [
  tag: 'changeVatOptions',
  options: Record<string, unknown>,
];

type KernelDeliveryDropExports = [tag: 'dropExports', krefs: string[]];

type KernelDeliveryMessage = [tag: 'message', target: string, msg: Message];

type KernelDeliveryNotify = [
  tag: 'notify',
  resolutions: KernelDeliveryOneNotify[],
];

type KernelDeliveryObject =
  | KernelDeliveryMessage
  | KernelDeliveryNotify
  | KernelDeliveryDropExports
  | KernelDeliveryRetireExports
  | KernelDeliveryRetireImports
  | KernelDeliveryChangeVatOptions
  | KernelDeliveryStartVat
  | KernelDeliveryStopVat
  | KernelDeliveryBringOutYourDead;

type KernelOneResolution = [
  kpid: string,
  rejected: boolean,
  data: SwingSetCapData,
];

type KernelSyscallAbandonExports = [
  tag: 'abandonExports',
  vatID: string,
  krefs: string[],
];

type KernelSyscallCallKernelHook = [
  tag: 'callKernelHook',
  hookName: string,
  args: SwingSetCapData,
];

type KernelSyscallDropImports = [tag: 'dropImports', krefs: string[]];

type KernelSyscallExit = [
  tag: 'exit',
  vatID: string,
  isFailure: boolean,
  info: SwingSetCapData,
];

type KernelSyscallInvoke = [
  tag: 'invoke',
  target: string,
  method: string,
  args: SwingSetCapData,
];

type KernelSyscallResolve = [
  tag: 'resolve',
  vatID: string,
  resolutions: KernelOneResolution[],
];

type KernelSyscallRetireExports = [tag: 'retireExports', krefs: string[]];

type KernelSyscallRetireImports = [tag: 'retireImports', krefs: string[]];

type KernelSyscallSend = [tag: 'send', target: string, msg: Message];

type KernelSyscallSubscribe = [tag: 'subscribe', vatID: string, kpid: string];

type KernelSyscallVatstoreDelete = [
  tag: 'vatstoreDelete',
  vatID: string,
  key: string,
];

type KernelSyscallVatstoreGet = [
  tag: 'vatstoreGet',
  vatID: string,
  key: string,
];

type KernelSyscallVatstoreGetNextKey = [
  tag: 'vatstoreGetNextKey',
  vatID: string,
  priorKey: string,
];

type KernelSyscallVatstoreSet = [
  tag: 'vatstoreSet',
  vatID: string,
  key: string,
  data: string,
];

type KernelSyscallObject =
  | KernelSyscallAbandonExports
  | KernelSyscallCallKernelHook
  | KernelSyscallDropImports
  | KernelSyscallExit
  | KernelSyscallInvoke
  | KernelSyscallResolve
  | KernelSyscallRetireExports
  | KernelSyscallRetireImports
  | KernelSyscallSend
  | KernelSyscallSubscribe
  | KernelSyscallVatstoreDelete
  | KernelSyscallVatstoreGet
  | KernelSyscallVatstoreGetNextKey
  | KernelSyscallVatstoreSet;

type KernelDeliveryOneNotify = [
  kpid: string,
  kp: { state: string; data: SwingSetCapData },
];

type KernelDeliveryRetireExports = [tag: 'retireExports', krefs: string[]];

type KernelDeliveryRetireImports = [tag: 'retireImports', krefs: string[]];

type KernelDeliveryStartVat = [tag: 'startVat', vatParameters: SwingSetCapData];

type KernelDeliveryStopVat = [
  tag: 'stopVat',
  disconnectObject: SwingSetCapData,
];

type LogAttributes = {
  'crank.syscallNum'?: Slog['syscallNum'];
  'process.uptime': Slog['monotime'];
} & Context;

interface MakeSlogSenderCommonOptions {
  env: typeof process.env;
  stateDir?: string;
  serviceName?: string;
}

type MakeSlogSenderOptions = MakeSlogSenderCommonOptions &
  Record<string, unknown>;

type Message = { methargs: SwingSetCapData; result: string | undefined | null };

type Run = {
  blockHeight: Slog['blockHeight'];
  blockTime: Slog['blockTime'];
  computrons: Slog['usedBeans'];
  id: Context['run.id'];
  number: Context['run.num'];
  time: Slog['time'];
  triggerBundleHash: Context['run.trigger.bundleHash'];
  triggerMsgIdx: Context['run.trigger.msgIdx'];
  triggerSender: Context['run.trigger.sender'];
  triggerSource: Context['run.trigger.source'];
  triggerTxHash: Context['run.trigger.txHash'];
  triggerType: Context['run.trigger.type'];
};

export type Slog = {
  blockHeight?: number;
  blockTime?: number;
  crankNum?: bigint;
  crankType?: string;
  deliveryNum?: bigint;
  inboundNum?: string;
  kd?: KernelDeliveryObject;
  ksc?: KernelSyscallObject;
  monotime: number;
  name?: string;
  phase?: string;
  remainingBeans?: bigint;
  replay?: boolean;
  runNum?: number;
  sender?: string;
  source?: string;
  endoZipBase64Sha512?: string;
  syscall?: VatSyscallObject[0];
  syscallNum?: number;
  time: number;
  type: string;
  usedBeans?: number;
  vatID?: string;
  vsc?: VatSyscallObject;
};

interface SwingSetCapData {
  body: string;
  slots: Array<string>;
}

type VatOneResolution = [
  vpid: string,
  isReject: boolean,
  data: SwingSetCapData,
];

type VatSyscallAbandonExports = [tag: 'abandonExports', slots: string[]];

type VatSyscallCallNow = [
  tag: 'callNow',
  target: string,
  method: string,
  args: SwingSetCapData,
];

type VatSyscallDropImports = [tag: 'dropImports', slots: string[]];

type VatSyscallExit = [tag: 'exit', isFailure: boolean, info: SwingSetCapData];

type VatSyscallResolve = [tag: 'resolve', resolutions: VatOneResolution[]];

type VatSyscallRetireExports = [tag: 'retireExports', slots: string[]];

type VatSyscallRetireImports = [tag: 'retireImports', slots: string[]];

type VatSyscallSend = [tag: 'send', target: string, msg: Message];

type VatSyscallSubscribe = [tag: 'subscribe', vpid: string];

type VatSyscallVatstoreDelete = [tag: 'vatstoreDelete', key: string];

type VatSyscallVatstoreGet = [tag: 'vatstoreGet', key: string];

type VatSyscallVatstoreGetNextKey = [
  tag: 'vatstoreGetNextKey',
  priorKey: string,
];

type VatSyscallVatstoreSet = [tag: 'vatstoreSet', key: string, data: string];
type VatSyscallObject =
  | VatSyscallAbandonExports
  | VatSyscallCallNow
  | VatSyscallDropImports
  | VatSyscallExit
  | VatSyscallResolve
  | VatSyscallRetireExports
  | VatSyscallRetireImports
  | VatSyscallSend
  | VatSyscallSubscribe
  | VatSyscallVatstoreDelete
  | VatSyscallVatstoreGet
  | VatSyscallVatstoreGetNextKey
  | VatSyscallVatstoreSet;
