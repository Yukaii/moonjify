import { EMOJI_SETS, EmojiSet, MOON_EMOJI_SET, WEATHER_EMOJI_SET, COLOR_SQUARE_EMOJI_SET, createCustomEmojiSet, analyzeEmojiBrightness } from '../lib/image-processor';

// Mock environment since we can't use DOM in Node.js
global.document = {
  createElement: jest.fn(() => ({
    getContext: jest.fn(() => ({
      clearRect: jest.fn(),
      fillText: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray([255, 255, 255, 255])
      }))
    })),
    width: 0,
    height: 0
  }))
} as any;

describe('Emoji Sets', () => {
  it('should have the required properties', () => {
    EMOJI_SETS.forEach(emojiSet => {
      expect(emojiSet).toHaveProperty('id');
      expect(emojiSet).toHaveProperty('name');
      expect(emojiSet).toHaveProperty('emojis');
      expect(emojiSet.emojis.length).toBeGreaterThan(0);
    });
  });

  it('should have moon emojis in the correct order', () => {
    expect(MOON_EMOJI_SET.emojis[0]).toBe('🌑'); // New moon (darkest)
    expect(MOON_EMOJI_SET.emojis[MOON_EMOJI_SET.emojis.length - 1]).toBe('🌘'); // Waning crescent
    expect(MOON_EMOJI_SET.emojis.includes('🌕')).toBe(true); // Full moon (brightest)
  });

  it('should have colored emoji sets with isColorMode property set', () => {
    expect(COLOR_SQUARE_EMOJI_SET.isColorMode).toBe(true);
    // The emoji order should be from black to white including colors
    expect(COLOR_SQUARE_EMOJI_SET.emojis[0]).toBe('⬛'); // Black
    expect(COLOR_SQUARE_EMOJI_SET.emojis[COLOR_SQUARE_EMOJI_SET.emojis.length - 1]).toBe('⬜'); // White
  });

  it('should fallback to linear brightness distribution when not in browser', async () => {
    const mockEmojis = ['⚫', '⚪'];
    
    // Mock browser environment to force fallback
    const originalWindow = global.window;
    global.window = undefined as any;
    
    const result = await analyzeEmojiBrightness(mockEmojis);
    
    expect(result).toHaveLength(2);
    expect(result[0].emoji).toBe('⚫');
    expect(result[0].brightness).toBe(0);
    expect(result[1].emoji).toBe('⚪');
    expect(result[1].brightness).toBe(1);
    
    // Restore window
    global.window = originalWindow;
  });

  it('should create a custom emoji set with the provided emojis', async () => {
    const customEmojis = ['🔴', '🟠', '🟡', '🟢', '🔵'];
    const customSet = await createCustomEmojiSet('test-id', 'Test Set', customEmojis, 'Test description');
    
    expect(customSet).toHaveProperty('id', 'test-id');
    expect(customSet).toHaveProperty('name', 'Test Set');
    expect(customSet.emojis).toHaveLength(customEmojis.length);
    expect(customSet.description).toBe('Test description');
    
    // The emojis should be in the same order since we're mocking the brightness analysis
    customEmojis.forEach((emoji, index) => {
      expect(customSet.emojis).toContain(emoji);
    });
  });

  it('should create a custom color emoji set with color information', async () => {
    const customEmojis = ['🟥', '🟧', '🟨', '🟩', '🟦'];
    
    // Mock getImageData to return different colors for testing
    const getImageDataMock = jest.fn().mockImplementation((emoji) => {
      const colors: Record<string, Uint8ClampedArray> = {
        '🟥': new Uint8ClampedArray([255, 0, 0, 255]),
        '🟧': new Uint8ClampedArray([255, 165, 0, 255]),
        '🟨': new Uint8ClampedArray([255, 255, 0, 255]),
        '🟩': new Uint8ClampedArray([0, 255, 0, 255]),
        '🟦': new Uint8ClampedArray([0, 0, 255, 255]),
      };
      
      return { data: colors[emoji] || new Uint8ClampedArray([0, 0, 0, 255]) };
    });
    
    // Apply the mock temporarily
    const originalGetImageData = document.createElement('canvas').getContext('2d')!.getImageData;
    document.createElement('canvas').getContext('2d')!.getImageData = getImageDataMock;
    
    const customSet = await createCustomEmojiSet('color-test', 'Color Test', customEmojis, 'Color test description', true);
    
    expect(customSet).toHaveProperty('id', 'color-test');
    expect(customSet).toHaveProperty('name', 'Color Test');
    expect(customSet.isColorMode).toBe(true);
    
    // Restore original mock
    document.createElement('canvas').getContext('2d')!.getImageData = originalGetImageData;
  });
});