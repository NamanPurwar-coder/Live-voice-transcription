
export type AudioChunkCallback = (base64Audio: string) => void;

export class AudioStreamer {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;

  async start(onAudioChunk: AudioChunkCallback) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.audioContext = new AudioContext();

    const workletCode = `
      class PCMProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.buffer = [];
        }

        process(inputs) {
          const input = inputs[0]?.[0];

          if (input) {
            this.buffer.push(...input);

            if (this.buffer.length >= 4096) {
              const chunk = this.buffer.slice(0, 4096);
              this.buffer = this.buffer.slice(4096);
              this.port.postMessage(chunk);
            }
          }

          return true;
        }
      }

      registerProcessor("pcm-processor", PCMProcessor);
    `;

    const blob = new Blob([workletCode], {
      type: "application/javascript",
    });

    const workletUrl = URL.createObjectURL(blob);

    await this.audioContext.audioWorklet.addModule(workletUrl);
    URL.revokeObjectURL(workletUrl);

    this.source = this.audioContext.createMediaStreamSource(this.stream);

    this.worklet = new AudioWorkletNode(
      this.audioContext,
      "pcm-processor"
    );

    this.worklet.port.onmessage = (event) => {
      const float32Data = event.data as Float32Array;

      if (!this.audioContext) return;

      const pcm16 = this.convertToPCM16(
        float32Data,
        this.audioContext.sampleRate,
        16000
      );

      const base64 = this.toBase64(pcm16);

      onAudioChunk(base64);
    };

    // Keep the audio graph alive without playing mic audio
    const muteNode = this.audioContext.createGain();
    muteNode.gain.value = 0;

    this.source.connect(this.worklet);
    this.worklet.connect(muteNode);
    muteNode.connect(this.audioContext.destination);
  }

  private convertToPCM16(
    input: Float32Array,
    inputRate: number,
    outputRate: number
  ): Int16Array {
    const ratio = inputRate / outputRate;
    const outputLength = Math.floor(input.length / ratio);
    const output = new Int16Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const position = i * ratio;
      const index = Math.floor(position);
      const fraction = position - index;

      const sample1 = input[index] ?? 0;
      const sample2 = input[index + 1] ?? sample1;

      const interpolated = sample1 + fraction * (sample2 - sample1);

      const clamped = Math.max(-1, Math.min(1, interpolated));

      output[i] = clamped < 0
        ? clamped * 32768
        : clamped * 32767;
    }

    return output;
  }

  private toBase64(pcm16: Int16Array): string {
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = "";

    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
  }

  async stop() {
    this.worklet?.disconnect();
    this.source?.disconnect();

    this.stream?.getTracks().forEach((track) => track.stop());

    if (this.audioContext) {
      await this.audioContext.close();
    }

    this.worklet = null;
    this.source = null;
    this.stream = null;
    this.audioContext = null;
  }
}
