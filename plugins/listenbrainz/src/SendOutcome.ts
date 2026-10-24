/**
 * How sending a listen went: sent, not reached and worth trying again later, refused because the
 * person's connection is gone, held back because the server's own setup with the service is
 * broken, or refused for good. A refusal says why, and whether it is something the person has to
 * put right on their own account there, such as a missing verified email address.
 */
type SendOutcome =
  | { kind: 'sent' | 'busy' | 'signedOut' }
  | { kind: 'misconfigured'; reason: string }
  | { kind: 'refused'; reason: string; isTheirs: boolean };

export type { SendOutcome };
