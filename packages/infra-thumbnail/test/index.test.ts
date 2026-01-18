import { add } from "../src";

describe('test', () => {
    it('test', async () => {
        // given
        console.log(1);
        console.log(process.env.INGNOH);

        // when

        // then
        expect(add(1, 1)).toBe(2);
    });
});