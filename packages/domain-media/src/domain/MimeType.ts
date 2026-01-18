import * as mime from "mime-types";
import { isNotEmpty } from "@joka/core/src/util/string.util";
import * as assert from "node:assert";

export class MimeType {
    static from(value: unknown): MimeType {
        assert.ok(isNotEmpty(value), "mimeType is empty");
        assert.ok(MimeType.isValidMimeType(value as string), `${value} is invalid for mimeType`);

        return new MimeType(value as string);
    }

    private static isValidMimeType(value: string): boolean {
        return !!mime.extension(value);
    }

    private constructor(public readonly value: string) {}

    get type(): string {
        return this.value.split("/").at(0) as string;
    }

    get subType(): string {
        return this.value.split("/").at(1) as string;
    }
}