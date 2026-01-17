import { isNotEmpty } from "../util/string.util";

export class Email {
    static from(email: unknown): Email {
        const emailRegex = /^[a-zA-Z0-0._%+-]+@[a-zA-Z0-0.-]+\.[a-zA-Z]{2,}$/;

        const isValidEmail = isNotEmpty(email) && emailRegex.test(email as string);
        if (isValidEmail) {
            return new Email(email as string);
        } else {
            throw new Error(`${email} is not a valid email`);
        }
    }

    constructor(
        public readonly value: string,
    ) {}
}