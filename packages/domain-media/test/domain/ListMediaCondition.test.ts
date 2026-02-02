import { ListMediaCondition } from '../../src/domain/ListMediaCondition';

describe('ListMediaCondition', () => {
  describe('from', () => {
    it('유효한 파라미터로 ListMediaCondition 객체를 생성한다', () => {
      // given
      const params = {
        limit: 10,
        filter: { albumId: 1, states: ['DRAFT', 'COMPLETE'] },
        cursor: { cid: 'cursor-123' },
        sortOrder: 'asc',
      };

      // when
      const condition = ListMediaCondition.from(params);

      // then
      expect(condition).toBeInstanceOf(ListMediaCondition);
      expect(condition.limit).toBe(10);
      expect(condition.filter.albumId).toBe(1);
      expect(condition.filter.states).toEqual(['DRAFT', 'COMPLETE']);
      expect(condition.cursor?.cid).toBe('cursor-123');
      expect(condition.sortOrder).toBe('asc');
    });

    it('limit이 없으면 기본값 20을 사용한다', () => {
      // given
      const params = {
        filter: { albumId: 1, states: [] },
      };

      // when
      const condition = ListMediaCondition.from(params);

      // then
      expect(condition.limit).toBe(ListMediaCondition.DefaultLimit);
      expect(condition.limit).toBe(20);
    });

    it('cursor가 없으면 null을 사용한다', () => {
      // given
      const params = {
        limit: 10,
        filter: { albumId: 1, states: [] },
      };

      // when
      const condition = ListMediaCondition.from(params);

      // then
      expect(condition.cursor).toBeNull();
    });

    it('sortOrder가 없으면 desc를 기본값으로 사용한다', () => {
      // given
      const params = {
        limit: 10,
        filter: { albumId: 1, states: [] },
      };

      // when
      const condition = ListMediaCondition.from(params);

      // then
      expect(condition.sortOrder).toBe('desc');
    });

    it('유효하지 않은 limit은 기본값으로 대체된다', () => {
      // given
      const params = {
        limit: 'invalid',
        filter: { albumId: 1, states: [] },
      };

      // when
      const condition = ListMediaCondition.from(params);

      // then
      expect(condition.limit).toBe(ListMediaCondition.DefaultLimit);
    });
  });

  describe('SortOrder', () => {
    it('ASC와 DESC 상수를 제공한다', () => {
      // given & when & then
      expect(ListMediaCondition.SortOrder.ASC).toBe('asc');
      expect(ListMediaCondition.SortOrder.DESC).toBe('desc');
    });
  });

  describe('hasDescendingOrder', () => {
    it('sortOrder가 desc이면 true를 반환한다', () => {
      // given
      const condition = ListMediaCondition.from({
        filter: { albumId: 1, states: [] },
        sortOrder: 'desc',
      });

      // when & then
      expect(condition.hasDescendingOrder).toBe(true);
    });

    it('sortOrder가 asc이면 false를 반환한다', () => {
      // given
      const condition = ListMediaCondition.from({
        filter: { albumId: 1, states: [] },
        sortOrder: 'asc',
      });

      // when & then
      expect(condition.hasDescendingOrder).toBe(false);
    });
  });

  describe('adjustedLimit', () => {
    it('limit에 1을 더한 값을 반환한다', () => {
      // given
      const condition = ListMediaCondition.from({
        limit: 10,
        filter: { albumId: 1, states: [] },
      });

      // when
      const result = condition.adjustedLimit;

      // then
      expect(result).toBe(11);
    });
  });

  describe('data', () => {
    it('객체 데이터를 반환한다', () => {
      // given
      const params = {
        limit: 15,
        filter: { albumId: 2, states: ['DRAFT'] },
        cursor: { cid: 'cursor-456' },
        sortOrder: 'asc',
      };
      const condition = ListMediaCondition.from(params);

      // when
      const data = condition.data;

      // then
      expect(data.limit).toBe(15);
      expect(data.filter).toEqual({ albumId: 2, states: ['DRAFT'] });
      expect(data.cursor).toEqual({ cid: 'cursor-456' });
      expect(data.sortOrder).toBe('asc');
    });
  });
});