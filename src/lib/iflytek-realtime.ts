export type IatTextState = {
  committed: string;
  pending: string;
};

type IatWord = {
  cw?: Array<{ w?: string }>;
};

type IatMessage = {
  code?: number;
  data?: {
    status?: number;
    result?: {
      pgs?: 'apd' | 'rpl';
      ws?: IatWord[];
    };
  };
};

export function applyIatMessage(state: IatTextState, message: string): IatTextState & { text: string; done: boolean } {
  const jsonData = JSON.parse(message) as IatMessage;
  if (jsonData.code !== undefined && jsonData.code !== 0) {
    throw new Error('讯飞实时转写失败');
  }

  const words = jsonData.data?.result?.ws || [];
  const text = words.map(item => item.cw?.[0]?.w || '').join('');
  let committed = state.committed;
  let pending = state.pending;

  if (text) {
    if (jsonData.data?.result?.pgs === 'apd' && pending) committed = pending;
    if (jsonData.data?.result?.pgs) {
      pending = `${committed}${text}`;
    } else {
      committed = `${committed}${text}`;
      pending = '';
    }
  }

  return {
    committed,
    pending,
    text: pending || committed,
    done: jsonData.data?.status === 2,
  };
}

export function pcm16ToBase64(samples: Int16Array): string {
  let binary = '';
  const bytes = new Uint8Array(samples.buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function downsampleTo16k(input: Float32Array, sampleRate: number): Int16Array {
  if (sampleRate === 16000) {
    return floatTo16BitPCM(input);
  }

  const ratio = sampleRate / 16000;
  const length = Math.floor(input.length / ratio);
  const output = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    output[i] = input[Math.floor(i * ratio)] || 0;
  }
  return floatTo16BitPCM(output);
}

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}
