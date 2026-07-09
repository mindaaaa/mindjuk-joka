const mockInvoke = jest.fn();

jest.mock('../../../src/application/use-case', () => ({
  ExtractThumbnail: {
    invoke: mockInvoke,
  },
}));

import { consumeThumbnailBatch } from '../../../src/infrastructure/queue/thumbnail.consumer';

const createMessage = (id: string, mediaCid: string) => ({
  id,
  body: { mediaCid },
  ack: jest.fn(),
  retry: jest.fn(),
});

describe('consumeThumbnailBatch', () => {
  beforeEach(() => jest.clearAllMocks());

  it('각 메시지를 use-case로 위임하고 성공 시 ack한다', async () => {
    // given
    const m1 = createMessage('1', 'cid-1');
    const m2 = createMessage('2', 'cid-2');
    mockInvoke.mockResolvedValue(undefined);

    // when
    await consumeThumbnailBatch({ messages: [m1, m2] } as any);

    // then
    expect(mockInvoke).toHaveBeenCalledWith({ mediaCid: 'cid-1' });
    expect(mockInvoke).toHaveBeenCalledWith({ mediaCid: 'cid-2' });
    expect(m1.ack).toHaveBeenCalledTimes(1);
    expect(m2.ack).toHaveBeenCalledTimes(1);
  });

  it('use-case가 실패해도 throw하지 않고 항상 ack(drop)한다', async () => {
    // given
    const m1 = createMessage('1', 'cid-1');
    const m2 = createMessage('2', 'cid-2');
    mockInvoke
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // when
    await expect(
      consumeThumbnailBatch({ messages: [m1, m2] } as any),
    ).resolves.toBeUndefined();

    // then: 실패한 m1도, 성공한 m2도 모두 ack, retry는 호출 안 함
    expect(m1.ack).toHaveBeenCalledTimes(1);
    expect(m1.retry).not.toHaveBeenCalled();
    expect(m2.ack).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
