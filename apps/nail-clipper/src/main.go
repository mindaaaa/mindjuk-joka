package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

// 요청당 능동 처리 시간 상한(ADR D5). 모든 ffmpeg/ffprobe 실행을 이 ctx로 묶는다.
const requestTimeout = 20 * time.Second

type thumbnailRequest struct {
	SourceURL string `json:"sourceUrl"`
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", handleHealth)
	mux.HandleFunc("/thumbnail", thumbnailHandler(generateThumbnail))

	server := &http.Server{Addr: ":8080", Handler: mux}

	go func() {
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server error: %v", err)
		}
	}()
	log.Println("nail-clipper listening on :8080")

	// 플랫폼이 scale-to-zero 시 SIGTERM을 보낸다 → graceful shutdown(ADR §3.3).
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
}

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusOK)
}

// thumbnailHandler는 썸네일 생성 함수를 주입받아 핸들러를 만든다.
// 프로덕션은 generateThumbnail을 주입하고, 테스트는 스텁을 주입해 exec/네트워크 없이 검증한다.
func thumbnailHandler(
	generate func(context.Context, string) ([]byte, string, error),
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req thumbnailRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.SourceURL == "" {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), requestTimeout)
		defer cancel()

		// gif를 버퍼에 모은 뒤 첫 프레임 blurhash를 계산한다(ADR §3.3 "응답 순서").
		gifBytes, hash, err := generate(ctx, req.SourceURL)
		if err != nil {
			// 빈/실패 결과는 non-2xx로 알린다 → nail-artist가 로그·drop(ADR §3.3 "빈 결과 방어").
			log.Printf("thumbnail failed: %v", err)
			http.Error(w, "thumbnail generation failed", http.StatusUnprocessableEntity)
			return
		}

		// 헤더(X-Blurhash)는 body보다 먼저 전송되어야 하므로 순서를 지킨다.
		w.Header().Set("Content-Type", "image/gif")
		w.Header().Set("X-Blurhash", hash)
		w.WriteHeader(http.StatusOK)
		if _, err := w.Write(gifBytes); err != nil {
			log.Printf("write response failed: %v", err)
		}
	}
}
