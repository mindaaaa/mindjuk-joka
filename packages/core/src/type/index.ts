import { Email } from "../model/Email";

export interface Actioned {
    at: Date;
    by: ActionedBy;
}

export interface ActionedBy {
    id: string;
    name: string;
    email: Email;
}

export type Nullable<T> = T | null;

export type Nullish<T> = T | null | undefined;