import { Url } from "@joka/core/src/model/Url";
import { MimeType } from "./MimeType";

interface ConstructorParameters {
    url: string;
    size: number;
    eTag: string;
    mimeType: string;
    blurhash: string;
}

export class Thumbnail {
    static from(params: ConstructorParameters): Thumbnail {
        return new Thumbnail(
            Url.from(params.url),
            params.size,
            params.eTag,
            MimeType.from(params.mimeType),
            params.blurhash,
        );
    }

    private constructor(
        public readonly url: Url,
        public readonly size: number,
        public readonly eTag: string,
        public readonly mimeType: MimeType,
        public readonly blurhash: string,
    ) {}
}