import { Actioned, Nullable } from "@joka/core/src/type";
import { User } from "@joka/core/src/model/User";
import { Content } from "./Content";

export type MediaState = "DRAFT" | "COMPLETE";

interface ConstructorParameters {
    id: number;
    description: string;
    user: User,
}

export class Media {
    static from(params: ConstructorParameters): Media {
        const createdAt = new Date();

        return new Media(
            params.id,
            params.description,
            "DRAFT",
            null,
            false,
            {
                at: createdAt,
                by: {
                    id: params.user.id,
                    name: params.user.name,
                    email: params.user.email,
                },
            },
        );
    }

    private constructor(
        public readonly id: number,
        public readonly description: string,
        public readonly state: MediaState,
        public readonly content: Nullable<Content>,
        public readonly isFavorite: boolean,
        public readonly created: Actioned,
    ) {}
}