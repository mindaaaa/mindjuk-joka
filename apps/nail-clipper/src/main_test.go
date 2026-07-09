package main

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHandleHealth(t *testing.T) {
	rec := httptest.NewRecorder()
	handleHealth(rec, httptest.NewRequest(http.MethodGet, "/health", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("health status = %d, want 200", rec.Code)
	}
}

// 성공 경로: 주입한 generate의 결과가 그대로 wire 계약(gif body + X-Blurhash)으로 나가야 한다(ADR §3.2/D2).
func TestThumbnailHandlerSuccess(t *testing.T) {
	gifBytes := []byte{0x47, 0x49, 0x46, 0x38} // 임의 바이트(핸들러는 디코드하지 않는다)
	stub := func(_ context.Context, sourceURL string) ([]byte, string, error) {
		if sourceURL != "https://signed/url" {
			t.Fatalf("generate got unexpected sourceURL: %q", sourceURL)
		}
		return gifBytes, "LGIFHASH", nil
	}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/thumbnail",
		strings.NewReader(`{"sourceUrl":"https://signed/url"}`))
	thumbnailHandler(stub)(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "image/gif" {
		t.Fatalf("Content-Type = %q, want image/gif", ct)
	}
	if h := rec.Header().Get("X-Blurhash"); h != "LGIFHASH" {
		t.Fatalf("X-Blurhash = %q, want LGIFHASH", h)
	}
	body, _ := io.ReadAll(rec.Body)
	if !bytes.Equal(body, gifBytes) {
		t.Fatalf("body = %v, want %v", body, gifBytes)
	}
}

// generate 실패는 422로 나가야 한다 → nail-artist가 로그·drop(ADR §3.3 "빈 결과 방어").
func TestThumbnailHandlerGenerateFailure(t *testing.T) {
	stub := func(context.Context, string) ([]byte, string, error) {
		return nil, "", errors.New("ffmpeg exploded")
	}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/thumbnail",
		strings.NewReader(`{"sourceUrl":"https://signed/url"}`))
	thumbnailHandler(stub)(rec, req)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422", rec.Code)
	}
}

// POST가 아니면 405. generate에 도달하기 전에 막혀야 한다.
func TestThumbnailHandlerRejectsNonPost(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/thumbnail", nil)
	thumbnailHandler(mustNotCall(t))(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want 405", rec.Code)
	}
}

// 잘못된/빈 바디는 400. 역시 generate에 도달하기 전에 막혀야 한다(exec/네트워크 미도달 보장).
func TestThumbnailHandlerRejectsBadBody(t *testing.T) {
	cases := map[string]string{
		"malformed json":    `{not json`,
		"empty sourceUrl":   `{"sourceUrl":""}`,
		"missing sourceUrl": `{}`,
	}
	for name, body := range cases {
		t.Run(name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodPost, "/thumbnail", strings.NewReader(body))
			thumbnailHandler(mustNotCall(t))(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400", rec.Code)
			}
		})
	}
}

// mustNotCall은 검증 분기가 generate(=exec/네트워크)에 절대 도달하지 않음을 강제한다.
func mustNotCall(t *testing.T) func(context.Context, string) ([]byte, string, error) {
	t.Helper()
	return func(context.Context, string) ([]byte, string, error) {
		t.Fatal("generate must not be called on a rejected request")
		return nil, "", nil
	}
}
