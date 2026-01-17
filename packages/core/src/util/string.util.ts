import * as assert from "node:assert";

export const isNotEmpty = (value: unknown): boolean => {
    assert.ok(typeof value === "string", "value must be a string");

    return value.trim().length > 0;
};

export const isEmpty = (value: unknown): boolean => !isNotEmpty(value);
