type SubsonicValue = string | number | boolean | null | SubsonicBody | SubsonicValue[];

type SubsonicBody = { [key: string]: SubsonicValue };

export type { SubsonicBody, SubsonicValue };
