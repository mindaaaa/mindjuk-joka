import { NotImplementedException } from '@joka/core/src/exception';

import { VideoThumbnailStrategy } from '../../../src/infrastructure/strategy/VideoThumbnailStrategy';

describe('VideoThumbnailStrategy', () => {
  const strategy = new VideoThumbnailStrategy();

  describe('supports', () => {
    it('video/* 는 지원하고 image/* 는 지원하지 않는다', () => {
      expect(strategy.supports('video/mp4')).toBe(true);
      expect(strategy.supports('image/jpeg')).toBe(false);
    });
  });

  describe('extract', () => {
    it('아직 구현되지 않아 NotImplementedException을 던진다', () => {
      expect(() => strategy.extract({} as any)).toThrow(
        NotImplementedException,
      );
    });
  });
});
