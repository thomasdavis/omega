/**
 * Type declarations for lamejs (CommonJS MP3 encoder library)
 * lamejs doesn't have official TypeScript types
 */

declare module 'lamejs' {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, kbps: number);
    encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array;
    flush(): Int8Array;
  }

  export const MPEGMode: any;
  export const Lame: any;
  export const BitStream: any;
}
