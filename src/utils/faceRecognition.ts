import * as faceapi from 'face-api.js';

// Hash Map for O(1) face embedding lookup
export class FaceHashMap {
  private map: Map<string, number[]>;

  constructor() {
    this.map = new Map();
  }

  // Add face embedding - O(1)
  set(name: string, embedding: number[]): void {
    this.map.set(name.toLowerCase(), embedding);
  }

  // Get face embedding - O(1)
  get(name: string): number[] | undefined {
    return this.map.get(name.toLowerCase());
  }

  // Check if name exists - O(1)
  has(name: string): boolean {
    return this.map.has(name.toLowerCase());
  }

  // Remove face embedding - O(1)
  delete(name: string): boolean {
    return this.map.delete(name.toLowerCase());
  }

  // Get all entries
  entries(): [string, number[]][] {
    return Array.from(this.map.entries());
  }

  // Get all names
  names(): string[] {
    return Array.from(this.map.keys());
  }

  // Clear all data
  clear(): void {
    this.map.clear();
  }

  // Get size
  size(): number {
    return this.map.size;
  }
}

// Face recognition utilities
export class FaceRecognitionEngine {
  private isModelLoaded = false;
  private hashMap: FaceHashMap;

  constructor() {
    this.hashMap = new FaceHashMap();
  }

  // Load face-api.js models
  async loadModels(): Promise<void> {
    if (this.isModelLoaded) return;

    const MODEL_URL = '/models';
    
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      
      this.isModelLoaded = true;
      console.log('Face recognition models loaded successfully');
    } catch (error) {
      console.error('Error loading models:', error);
      throw new Error('Failed to load face recognition models');
    }
  }

  // Detect face and extract embedding from image
  async detectFace(imageElement: HTMLImageElement | HTMLVideoElement): Promise<number[] | null> {
    if (!this.isModelLoaded) {
      await this.loadModels();
    }

    const detection = await faceapi
      .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return null;
    }

    return Array.from(detection.descriptor);
  }

  // Detect all faces in image
  async detectAllFaces(imageElement: HTMLImageElement | HTMLVideoElement) {
    if (!this.isModelLoaded) {
      await this.loadModels();
    }

    const detections = await faceapi
      .detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    return detections;
  }

  // Calculate Euclidean distance between two embeddings
  private euclideanDistance(embedding1: number[], embedding2: number[]): number {
    let sum = 0;
    for (let i = 0; i < embedding1.length; i++) {
      const diff = embedding1[i] - embedding2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  // Register a new face
  registerFace(name: string, embedding: number[]): void {
    this.hashMap.set(name, embedding);
  }

  // Recognize face from embedding
  recognizeFace(embedding: number[], threshold: number = 0.6): { name: string; confidence: number } | null {
    let bestMatch: { name: string; distance: number } | null = null;

    for (const [name, storedEmbedding] of this.hashMap.entries()) {
      const distance = this.euclideanDistance(embedding, storedEmbedding);
      
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { name, distance };
      }
    }

    if (bestMatch && bestMatch.distance < threshold) {
      const confidence = 1 - bestMatch.distance;
      return {
        name: bestMatch.name,
        confidence: Math.max(0, Math.min(1, confidence))
      };
    }

    return null;
  }

  // Load all faces from database into hash map
  loadFacesFromData(faces: { name: string; embedding: number[] }[]): void {
    this.hashMap.clear();
    for (const face of faces) {
      this.hashMap.set(face.name, face.embedding);
    }
  }

  // Get hash map instance
  getHashMap(): FaceHashMap {
    return this.hashMap;
  }

  // Get model loaded status
  isReady(): boolean {
    return this.isModelLoaded;
  }
}

// Singleton instance
export const faceRecognition = new FaceRecognitionEngine();
