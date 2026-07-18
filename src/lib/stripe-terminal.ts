import { orgApi } from '@/lib/api';

/**
 * Runs the full Stripe Terminal flow for an already-created PaymentIntent:
 * discover → connect → collect → process. Throws on any failure.
 */
/** Thrown when the caller aborts an in-progress reader collection (e.g. the tip changed). */
export class TerminalAbortError extends Error {
  constructor() {
    super('Card reader collection aborted');
    this.name = 'TerminalAbortError';
  }
}

export async function collectTerminalPayment(params: {
  orgId: string;
  clientSecret: string;
  onStatus: (status: string) => void;
  onUnexpectedDisconnect: () => void;
  /** When aborted, an in-progress collection is cancelled and TerminalAbortError is thrown. */
  signal?: AbortSignal;
}): Promise<void> {
  const { orgId, clientSecret, onStatus, onUnexpectedDisconnect, signal } = params;

  if (signal?.aborted) throw new TerminalAbortError();

  const { loadStripeTerminal } = await import('@stripe/terminal-js');
  const StripeTerminal = await loadStripeTerminal();
  if (!StripeTerminal) {
    throw new Error('Stripe Terminal failed to load');
  }

  let connected = false;
  const terminal = StripeTerminal.create({
    onFetchConnectionToken: async () => {
      const { secret } = await orgApi.getTerminalConnectionToken(orgId);
      return secret;
    },
    onUnexpectedReaderDisconnect: () => {
      connected = false;
      onUnexpectedDisconnect();
    },
  });

  const onAbort = () => {
    terminal.cancelCollectPaymentMethod().catch(() => undefined);
  };
  signal?.addEventListener('abort', onAbort);

  try {
    onStatus('Discovering readers…');
    const discover = await terminal.discoverReaders({ simulated: import.meta.env.DEV });
    if (signal?.aborted) throw new TerminalAbortError();
    if ('error' in discover) {
      throw new Error(discover.error.message);
    }
    const readers = discover.discoveredReaders;
    if (!readers?.length) {
      throw new Error(
        import.meta.env.DEV
          ? 'No readers found. Use a simulated reader in dev or register a reader in Settings → Payments.'
          : 'No card reader found. Register a reader in Settings → Payments.',
      );
    }

    onStatus(`Connecting to ${readers[0].label ?? 'reader'}…`);
    const connect = await terminal.connectReader(readers[0]);
    if (signal?.aborted) throw new TerminalAbortError();
    if ('error' in connect) {
      throw new Error(connect.error.message);
    }
    connected = true;

    onStatus('Waiting for card — tap, insert, or swipe…');
    const collect = await terminal.collectPaymentMethod(clientSecret);
    if (signal?.aborted) throw new TerminalAbortError();
    if ('error' in collect) {
      throw new Error(collect.error.message);
    }

    onStatus('Processing…');
    const process = await terminal.processPayment(collect.paymentIntent);
    if (signal?.aborted) throw new TerminalAbortError();
    if ('error' in process) {
      throw new Error(process.error.message);
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
    if (connected) {
      await terminal.disconnectReader().catch(() => undefined);
    }
  }
}
