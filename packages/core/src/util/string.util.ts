import * as assert from "node:assert";

export const isNotEmpty = (value: unknown): boolean => {
    assert.ok(typeof value === "string", "value must be a string");

    return value.trim().length > 0;
};

export const isEmpty = (value: unknown): boolean => !isNotEmpty(value);

export const isEmail = (value: unknown): boolean => {
    const emailRegex = /^[a-zA-Z0-0._%+-]+@[a-zA-Z0-0.-]+\.[a-zA-Z]{2,}$/;

    return isNotEmpty(value) && emailRegex.test(value as string);
};