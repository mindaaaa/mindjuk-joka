import ClientFactory from '../src/client';

describe('ClientFactory 읽기 인스턴스 선택', () => {
  it('읽기 endpoint 미설정 시 쓰기 인스턴스(createInstance)로 폴백한다', () => {
    ClientFactory.configureRead(undefined);
    const spy = jest
      .spyOn(ClientFactory, 'createInstance')
      .mockReturnValue({} as never);

    ClientFactory.createReadInstance();

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('읽기 endpoint 설정 시 폴백하지 않고 별도 인스턴스를 만든다', () => {
    ClientFactory.configureRead('postgres://u:p@ep.neon.tech/db');
    const spy = jest.spyOn(ClientFactory, 'createInstance');

    const db = ClientFactory.createReadInstance();

    expect(spy).not.toHaveBeenCalled();
    expect(db).toBeDefined();
    spy.mockRestore();
  });

  // 읽기 인스턴스의 정적 타입은 쓰기와 동일하게 캐스팅되어 .transaction 타입이 노출된다.
  // 실수로 읽기(neon-http) 커넥션에 트랜잭션을 걸면 런타임에 실패함을 고정한다
  // (쓰기/트랜잭션은 반드시 createInstance() 쪽으로만 가야 한다는 불변식의 회귀 방지).
  it('읽기(neon-http) 인스턴스에서 .transaction 호출은 런타임에 실패한다', async () => {
    ClientFactory.configureRead('postgres://u:p@ep.neon.tech/db');
    const db = ClientFactory.createReadInstance();

    await expect(
      (async () => db.transaction(async () => undefined))(),
    ).rejects.toThrow();
  });
});
