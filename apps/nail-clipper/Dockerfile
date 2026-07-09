# 1) 정적 ffmpeg + ffprobe: 유지보수되는 static 빌드 이미지에서 바이너리만 가져온다.
FROM mwader/static-ffmpeg:7.1 AS ffmpeg

# 2) Go 서버 정적 빌드.
FROM golang:1.23-alpine AS build
WORKDIR /app
COPY src/go.mod src/go.sum ./
RUN go mod download
COPY src/*.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server

# 3) 최소 런타임: distroless static(CA 인증서 내장, 셸/패키지매니저 없음).
FROM gcr.io/distroless/static-debian12
COPY --from=ffmpeg /ffmpeg /ffprobe /usr/local/bin/
COPY --from=build /server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
