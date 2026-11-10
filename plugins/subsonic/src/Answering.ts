import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { Asked } from './Asked';
import type { SubsonicBody } from './SubsonicBody';
import type { SubsonicReply } from './subsonicAnswer';

type Answering = {
  valence: ValenceHost;
  person: { profileId: string; name: string; login: string };
  asked: Asked;
  receivedAt: string;
  ok: (body?: SubsonicBody) => SubsonicReply;
  failed: (code: number, message: string) => SubsonicReply;
};

export type { Answering };
