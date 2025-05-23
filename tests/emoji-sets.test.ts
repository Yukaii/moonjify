import { EMOJI_SETS, EmojiSet, MOON_EMOJI_SET, WEATHER_EMOJI_SET, createCustomEmojiSet, analyzeEmojiBrightness } from '../lib/image-processor';

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

  it('should have weather emoji set with improved contrast', () => {
    expect(WEATHER_EMOJI_SET.emojis).toHaveLength(5);
    expect(WEATHER_EMOJI_SET.emojis[0]).toBe('⚫'); // Darkest
    expect(WEATHER_EMOJI_SET.emojis[WEATHER_EMOJI_SET.emojis.length - 1]).toBe('☀'); // Brightest
    
    // Check that the neutral emojis match the darkest and brightest ones
    expect(WEATHER_EMOJI_SET.neutralEmojis?.[0]).toBe(WEATHER_EMOJI_SET.emojis[0]);
    expect(WEATHER_EMOJI_SET.neutralEmojis?.[1]).toBe(WEATHER_EMOJI_SET.emojis[WEATHER_EMOJI_SET.emojis.length - 1]);
  });

  it('should have enough emojis in each set for good contrast range', () => {
    EMOJI_SETS.forEach(emojiSet => {
      // Each set should have at least 3 emojis for a good brightness range
      expect(emojiSet.emojis.length).toBeGreaterThanOrEqual(3);
      
      // Ensure sets have both dark and light emojis (neutral emojis should be defined)
      expect(emojiSet.neutralEmojis).toBeDefined();
      expect(emojiSet.neutralEmojis?.length).toBeGreaterThanOrEqual(2);
    });
  });
});