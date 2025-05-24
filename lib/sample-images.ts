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
    description: 'Smooth transition from dark to light',
    url: '/samples/gradient.svg'
  },
  {
    id: 'mountains',
    name: 'Mountains',
    description: 'Mountain silhouette against the sky',
    url: '/samples/mountains.svg'
  },
  {
    id: 'circles',
    name: 'Circles',
    description: 'Geometric pattern with varying sizes',
    url: '/samples/circles.svg'
  },
  {
    id: 'checkerboard',
    name: 'Checkerboard',
    description: 'Classic black and white pattern',
    url: '/samples/checkerboard.svg'
  },
  {
    id: 'spiral',
    name: 'Spiral',
    description: 'Hypnotic spiral pattern',
    url: '/samples/spiral.svg'
  }
];