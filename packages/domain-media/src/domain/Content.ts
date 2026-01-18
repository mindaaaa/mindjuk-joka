import { Url } from "@joka/core/src/model/Url";
import { Nullable } from "@joka/core/src/type";
import { MimeType } from "./MimeType";
import { Thumbnail } from "./Thumbnail";

interface ConstructorParameters {
    url: string;
    size: number;
    eTag: string;
    mimeType: string;
    thumbnail: Nullable<Thumbnail>;
}

export class Content {
    static from(params: ConstructorParameters): Content {
        return new Content(
            Url.from(params.url),
            params.size,
            params.eTag,
            MimeType.from(params.mimeType),
            params.thumbnail,
        );
    }

    private constructor(
        public readonly url: Url,
        public readonly size: number,
        public readonly eTag: string,
        public readonly mimeType: MimeType,
        public readonly thumbnail: Nullable<Thumbnail>,
    ) {}
}