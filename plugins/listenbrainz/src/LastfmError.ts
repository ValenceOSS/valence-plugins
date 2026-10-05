/** Codes Last.fm answers with that mean the session or sign-in is gone, so retrying cannot help. */
const SIGNED_OUT = new Set([4, 9, 14, 15, 26]);

/** Codes Last.fm answers with when it is only busy, so the same call can be made again later. */
const BUSY = new Set([8, 11, 16, 29]);

/** Last.fm refusing a call, with its error code, or 0 where it did not answer at all. */
class LastfmError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }

  /** Whether the person needs to connect Last.fm again. */
  get isSignedOut(): boolean {
    return SIGNED_OUT.has(this.code);
  }

  /** Whether the call is worth making again later. */
  get isBusy(): boolean {
    return this.code === 0 || BUSY.has(this.code);
  }
}

export { LastfmError };
