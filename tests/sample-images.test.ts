import { SAMPLE_IMAGES } from '../components/sample-images-dialog';

describe('Sample Images for Onboarding', () => {
  // Test that sample images are defined correctly
  it('Sample images are properly defined', () => {
    // There should be multiple sample images
    expect(SAMPLE_IMAGES.length).toBeGreaterThan(0);
    
    // Each sample image should have the required properties
    SAMPLE_IMAGES.forEach(image => {
      expect(typeof image.name).toBe('string');
      expect(typeof image.path).toBe('string');
      expect(typeof image.description).toBe('string');
      expect(['static', 'animated']).toContain(image.type);
      
      // Path should start with /samples/
      expect(image.path.startsWith('/samples/')).toBe(true);
    });
  });
  
  // Test that paths are unique
  it('Sample image paths are unique', () => {
    const paths = SAMPLE_IMAGES.map(image => image.path);
    const uniquePaths = new Set(paths);
    
    expect(paths.length).toBe(uniquePaths.size);
  });
  
  // Test that we have both static and animated images
  it('Both static and animated images are available', () => {
    const types = SAMPLE_IMAGES.map(image => image.type);
    
    expect(types.includes('static')).toBe(true);
    expect(types.includes('animated')).toBe(true);
  });
});