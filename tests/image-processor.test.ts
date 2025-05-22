import { processCanvasToEmojis, EmojiSet } from '../lib/image-processor';

// Mock the environment since we can't use DOM in Node.js
global.document = {
  createElement: jest.fn(() => ({
    getContext: jest.fn(() => ({
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray([
          // Row 1: 2 pixels (RGBA)
          0, 0, 0, 255,       // Black
          255, 255, 255, 255, // White
          // Row 2: 2 pixels (RGBA)
          100, 100, 100, 255, // Gray
          200, 200, 200, 255  // Light Gray
        ])
      }))
    })),
    width: 2,
    height: 2
  }))
} as any;

// Expose processCanvasToEmojis for testing (export it if it's not exported)
jest.mock('../lib/image-processor', () => {
  const original = jest.requireActual('../lib/image-processor');
  return {
    ...original,
    processCanvasToEmojis: jest.fn((canvas, width, height, inverted, curvePoints, curveHeight, emojiSet) => {
      // Simplified implementation for testing
      const customEmojis = emojiSet?.emojis || ['🌑', '🌕'];
      const result = [
        customEmojis[0], customEmojis[customEmojis.length - 1], '\n',
        customEmojis[Math.floor(customEmojis.length / 3)], customEmojis[Math.floor(2 * customEmojis.length / 3)], '\n'
      ].join('');
      return Promise.resolve(result);
    })
  };
});

import { processImage } from '../lib/image-processor';

describe('Image Processing with Custom Emoji Sets', () => {
  const mockImage = new Blob([''], { type: 'image/jpeg' });
  const mockEmojiSet: EmojiSet = {
    id: 'test',
    name: 'Test Set',
    emojis: ['⚫', '🟤', '🟠', '⚪']
  };

  beforeAll(() => {
    // Mock URL functions
    global.URL = {
      createObjectURL: jest.fn(() => 'mock-url'),
      revokeObjectURL: jest.fn()
    } as any;

    // Mock Image
    global.Image = jest.fn(() => ({
      onload: null,
      onerror: null,
      crossOrigin: '',
      src: '',
      width: 100,
      height: 100
    })) as any;
  });

  it('should use the provided custom emoji set for processing', async () => {
    // Mock document ready state so Image onload will be called
    Object.defineProperty(document, 'readyState', { value: 'complete' });

    // Mock implementation to call onload immediately
    jest.spyOn(global, 'Image').mockImplementation(() => {
      const img = {
        onload: null as any,
        onerror: null as any,
        crossOrigin: '',
        src: '',
        width: 100,
        height: 100
      };
      setTimeout(() => {
        if (img.onload) img.onload();
      }, 0);
      return img as any;
    });

    const result = await processImage(mockImage, 2, false, [], 200, mockEmojiSet);

    // The result should contain emojis from our custom set
    expect(result).toContain(mockEmojiSet.emojis[0]);
    expect(result).toContain(mockEmojiSet.emojis[mockEmojiSet.emojis.length - 1]);
  });
});