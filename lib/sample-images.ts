// Sample images for the app

export interface SampleImage {
  id: string;
  name: string;
  description: string;
  url: string;
}

export const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: 'gradient',
    name: 'Gradient',
    description: 'Perfect for testing brightness range',
    url: '/samples/gradient.svg'
  },
  {
    id: 'mountains',
    name: 'Mountains',
    description: 'Silhouette with crisp edges',
    url: '/samples/mountains.svg'
  },
  {
    id: 'circles',
    name: 'Circles',
    description: 'Dot pattern with varied densities',
    url: '/samples/circles.svg'
  },
  {
    id: 'checkerboard',
    name: 'Checkerboard',
    description: 'High contrast alternating pattern',
    url: '/samples/checkerboard.svg'
  },
  {
    id: 'spiral',
    name: 'Spiral',
    description: 'Hypnotic swirl with fine details',
    url: '/samples/spiral.svg'
  }
];