import * as ort from 'onnxruntime-web';

// Configure ONNX Runtime WASM paths
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/';

export class DepthEstimator {
  private session: ort.InferenceSession | null = null;
  private modelUrl: string;
  private modelWidth = 518;
  private modelHeight = 518;
  private inputName: string = 'pixel_values';
  private useFallback: boolean = false;

  constructor(modelUrl: string) {
    this.modelUrl = modelUrl;
  }

  async initialize(onProgress?: (progress: number) => void): Promise<void> {
    try {
      const response = await fetch(this.modelUrl);

      if (!response.ok) {
        this.useFallback = true;
        console.log('Using simulated depth estimation (AI model not loaded)');
        return;
      }

      const contentLength = response.headers.get('content-length');

      if (contentLength && onProgress) {
        const total = parseInt(contentLength, 10);
        const reader = response.body?.getReader();
        const chunks: Uint8Array[] = [];
        let receivedLength = 0;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            receivedLength += value.length;
            onProgress(Math.round((receivedLength / total) * 100));
          }

          const blob = new Blob(chunks);
          const arrayBuffer = await blob.arrayBuffer();

          this.session = await ort.InferenceSession.create(arrayBuffer, {
            executionProviders: ['wasm'],
          });
        } else {
          const arrayBuffer = await response.arrayBuffer();
          this.session = await ort.InferenceSession.create(arrayBuffer, {
            executionProviders: ['wasm'],
          });
        }
      } else {
        this.session = await ort.InferenceSession.create(this.modelUrl, {
          executionProviders: ['wasm'],
        });
      }

      console.log('✓ AI depth model loaded successfully');
      if (this.session.inputNames.length > 0) {
        this.inputName = this.session.inputNames[0];
      }
      this.useFallback = false;
    } catch (error) {
      this.useFallback = true;
      console.log('Using simulated depth estimation');
    }
  }

  async estimateDepth(imageData: ImageData): Promise<ImageData> {
    if (this.useFallback) {
      return this.fallbackDepthEstimation(imageData);
    }

    if (!this.session) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    const inputTensor = this.preprocessImage(imageData);
    const feeds = { [this.inputName]: inputTensor };
    const results = await this.session.run(feeds);
    const output = results[Object.keys(results)[0]];
    return this.postprocessDepth(output, imageData.width, imageData.height);
  }

  private fallbackDepthEstimation(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    const depthData = new ImageData(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        const centerX = width / 2;
        const centerY = height / 2;
        const distFromCenter = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
        const radialFactor = 1 - (distFromCenter / maxDist) * 0.3;
        const depth = luminance * radialFactor;
        const invertedDepth = 255 - depth;

        depthData.data[idx] = invertedDepth;
        depthData.data[idx + 1] = invertedDepth;
        depthData.data[idx + 2] = invertedDepth;
        depthData.data[idx + 3] = 255;
      }
    }
    return depthData;
  }

  private preprocessImage(imageData: ImageData): ort.Tensor {
    const canvas = document.createElement('canvas');
    canvas.width = this.modelWidth;
    canvas.height = this.modelHeight;
    const ctx = canvas.getContext('2d')!;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0, this.modelWidth, this.modelHeight);
    const resizedData = ctx.getImageData(0, 0, this.modelWidth, this.modelHeight);

    const float32Data = new Float32Array(3 * this.modelWidth * this.modelHeight);
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    for (let i = 0; i < this.modelWidth * this.modelHeight; i++) {
      const pixelOffset = i * 4;
      float32Data[i] = (resizedData.data[pixelOffset] / 255.0 - mean[0]) / std[0];
      float32Data[this.modelWidth * this.modelHeight + i] =
        (resizedData.data[pixelOffset + 1] / 255.0 - mean[1]) / std[1];
      float32Data[2 * this.modelWidth * this.modelHeight + i] =
        (resizedData.data[pixelOffset + 2] / 255.0 - mean[2]) / std[2];
    }

    return new ort.Tensor('float32', float32Data, [1, 3, this.modelHeight, this.modelWidth]);
  }

  private postprocessDepth(tensor: ort.Tensor, targetWidth: number, targetHeight: number): ImageData {
    const data = tensor.data as Float32Array;
    let height: number, width: number;
    if (tensor.dims.length === 4) {
      [, , height, width] = tensor.dims;
    } else if (tensor.dims.length === 3) {
      [, height, width] = tensor.dims;
    } else if (tensor.dims.length === 2) {
      [height, width] = tensor.dims;
    } else {
      throw new Error(`Unexpected tensor shape: ${tensor.dims}`);
    }
    height = Math.floor(height);
    width = Math.floor(width);
    if (!height || !width || height <= 0 || width <= 0) {
      throw new Error(`Invalid dimensions: ${width}x${height}`);
    }

    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);

    for (let i = 0; i < data.length; i++) {
      const normalized = ((data[i] - min) / (max - min)) * 255;
      const pixelOffset = i * 4;
      imageData.data[pixelOffset] = normalized;
      imageData.data[pixelOffset + 1] = normalized;
      imageData.data[pixelOffset + 2] = normalized;
      imageData.data[pixelOffset + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = targetWidth;
    outputCanvas.height = targetHeight;
    const outputCtx = outputCanvas.getContext('2d')!;
    outputCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
    return outputCtx.getImageData(0, 0, targetWidth, targetHeight);
  }

  dispose(): void {
    this.session = null;
  }
}
