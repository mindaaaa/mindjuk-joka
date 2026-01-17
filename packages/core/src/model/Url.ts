import * as assert from "node:assert";
import { isNotEmpty } from "../util/string.util";

export class Url {
    static from(url: unknown): Url {
        assert.ok(isNotEmpty(url), "Url path is empty");

        const parsed = new URL(url as string);
        if (["http", "https"].includes(parsed.protocol)) {
            return new Url(parsed);
        } else {
            throw new Error(`${parsed.protocol} is not a valid protocol`);
        }
    }

    private constructor(public readonly url: URL) {}

    get path() {
        return this.url.href;
    }
}