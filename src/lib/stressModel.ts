import * as tf from '@tensorflow/tfjs';
import type { BehavioralFeatures } from './behaviorTracker';

export class StressModel {
  private model: tf.Sequential;
  private isTrained = false;

  constructor() {
    this.model = tf.sequential();
    this.model.add(tf.layers.dense({ units: 8, activation: 'relu', inputShape: [4] }));
    this.model.add(tf.layers.dense({ units: 4, activation: 'relu' }));
    this.model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    this.model.compile({
      optimizer: tf.train.adam(),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });
  }

  async trainWithSyntheticData() {
    if (this.isTrained) return;

    const samples = 1000;
    const inputs: number[][] = [];
    const labels: number[][] = [];

    for (let i = 0; i < samples; i++) {
      const isStressed = Math.random() > 0.5;
      if (isStressed) {
        // Stressed profile: High values, erratic
        inputs.push([
          Math.random() * 500 + 500, // mouseSpeed: 500-1000
          Math.random() * 300 + 200, // mouseJitter: 200-500
          Math.random() * 4 + 1,     // clickRate: 1-5
          Math.random() * 400 + 400  // typingSpeed: 400-800
        ]);
        labels.push([1]);
      } else {
        // Relaxed profile: Lower values, smooth
        inputs.push([
          Math.random() * 200 + 50,  // mouseSpeed: 50-250
          Math.random() * 50 + 10,   // mouseJitter: 10-60
          Math.random() * 0.5,       // clickRate: 0-0.5
          Math.random() * 200 + 100  // typingSpeed: 100-300
        ]);
        labels.push([0]);
      }
    }

    const xs = tf.tensor2d(this.normalize(inputs));
    const ys = tf.tensor2d(labels);

    await this.model.fit(xs, ys, {
      epochs: 20,
      batchSize: 32,
      shuffle: true,
      verbose: 0
    });

    xs.dispose();
    ys.dispose();
    this.isTrained = true;
    console.log('Stress detection model trained with synthetic data.');
  }

  private normalize(data: number[][]): number[][] {
    // Basic min-max normalization based on expected ranges
    // mouseSpeed: 0-2000, mouseJitter: 0-1000, clickRate: 0-10, typingSpeed: 0-1000
    return data.map(row => [
      Math.min(row[0] / 2000, 1),
      Math.min(row[1] / 1000, 1),
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
