import { cutTo } from './cutTo';

const HIDDEN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f‪-‮⁦-⁩]/gu;

/**
 * Text from elsewhere made fit to show on a plugin's page: without the control and
 * direction-changing characters the host refuses, and cut to the length the place allows.
 *
 * @param text - The text.
 * @param most - The most characters it may have.
 * @returns The text, safe to show.
 */
const shownAs = (text: string, most: number): string => cutTo(text.replace(HIDDEN, ''), most);

export { shownAs };
