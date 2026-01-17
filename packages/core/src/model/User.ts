import {Email} from "./Email";

interface ConstructorParameters {
    id: string;
    name: string;
    email: Email;
}

export class User {
    static from(params: ConstructorParameters): User {
        return new User(
            params.id,
            params.name,
            params.email,
        )
    }
    private constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly email: Email,
    ) {}
}