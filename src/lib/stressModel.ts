import * as tf from '@tensorflow/tfjs';
import type { BehavioralFeatures } from './behaviorTracker';

export class StressModel {
  private model: tf.Sequential;
  private isTrained = false;

  constructor() {
    this.model = tf.sequential();
    
    // Deeper architecture for better feature extraction
    this.model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [4] }));
    this.model.add(tf.layers.dropout({ rate: 0.1 }));
    this.model.add(tf.layers.dense({ units: 12, activation: 'relu' }));
    this.model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
    this.model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });
  }

  async trainWithSyntheticData() {
    if (this.isTrained) return;

    const samples = 1500;
    const inputs: number[][] = [];
    const labels: number[][] = [];

    for (let i = 0; i < samples; i++) {
      const isStressed = Math.random() > 0.5;
      if (isStressed) {
        // Stressed profile: High values, erratic movements, rapid typing bursts
        inputs.push([
          Math.random() * 600 + 700, // mouseSpeed: 700-1300
          Math.random() * 400 + 250, // mouseJitter: 250-650
          Math.random() * 5 + 1.5,   // clickRate: 1.5-6.5
          Math.random() * 500 + 450  // typingSpeed: 450-950
        ]);
        labels.push([1]);
      } else {
        // Relaxed profile: Lower values, smooth movements, steady typing
        inputs.push([
          Math.random() * 250 + 50,  // mouseSpeed: 50-300
          Math.random() * 60 + 10,   // mouseJitter: 10-70
          Math.random() * 0.8,       // clickRate: 0-0.8
          Math.random() * 250 + 100  // typingSpeed: 100-350
        ]);
        labels.push([0]);
      }
    }

    const xs = tf.tensor2d(this.normalize(inputs));
    const ys = tf.tensor2d(labels);

    await this.model.fit(xs, ys, {
      epochs: 35,
      batchSize: 32,
      shuffle: true,
      verbose: 0
    });

    xs.dispose();
    ys.dispose();
    this.isTrained = true;
    console.log('Stress detection model trained with improved synthetic data.');
  }

  private normalize(data: number[][]): number[][] {
    // Robust normalization based on calibrated ranges
    // mouseSpeed: 0-1500, mouseJitter: 0-800, clickRate: 0-10, typingSpeed: 0-1000
    return data.map(row => [
      Math.min(row[0] / 1500, 1),
      Math.min(row[1] / 800, 1),
      Math.min(row[2] / 10, 1),
      Math.min(row[3] / 1000, 1)
    ]);
  }

  async predict(features: BehavioralFeatures): Promise<number> {
    if (!this.isTrained) await this.trainWithSyntheticData();

    const input = tf.tensor2d(this.normalize([[
      features.mouseSpeed,
      features.mouseJitter,
      features.clickRate,
      features.typingSpeed
    ]]));

    const prediction = this.model.predict(input) as tf.Tensor;
    const score = (await prediction.data())[0];
    
    input.dispose();
    prediction.dispose();
    
    return score;
  }
}

export const stressModel = new StressModel();
