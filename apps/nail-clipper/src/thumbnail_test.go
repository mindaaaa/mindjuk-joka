package main

import (
	"bytes"
	"image"
	"image/color"
	"image/gif"
	"strings"
	"testing"
)

// adaptiveFps: 영상 길이가 얼마든 처리 윈도우 안에서 프레임 수는 항상 4여야 한다(ADR §3.3).
// 네트워크·ffmpeg 없이 순수하게 검증한다.
func TestAdaptiveFps(t *testing.T) {
	cases := []struct {
		name     string
		duration float64
		wantFps  float64
	}{
		{"0.5초 → fps 8", 0.5, 8.0},
		{"1초 → fps 4", 1.0, 4.0},
		{"8초 → fps 0.5", 8.0, 0.5},
		{"10초 → fps 0.4", 10.0, 0.4},
		{"30초 → window 10 → fps 0.4", 30.0, 0.4},
		{"180초 → window 10 → fps 0.4", 180.0, 0.4},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := adaptiveFps(tc.duration)
			if got != tc.wantFps {
				t.Fatalf("adaptiveFps(%v) = %v, want %v", tc.duration, got, tc.wantFps)
			}

			// 핵심 불변식: fps × window == 4프레임(짧은 영상 붕괴 방지, ADR §3.3).
			window := tc.duration
			if window > processWindow {
				window = processWindow
			}
			if frames := got * window; frames < 3.999 || frames > 4.001 {
				t.Fatalf("duration %v → %v frames, want ~4", tc.duration, frames)
			}
		})
	}
}

// firstFrameBlurhash: in-memory로 만든 gif의 첫 프레임을 디코드해 blurhash를 낸다.
// ffmpeg가 만든 실제 gif 대신, 동일한 image/gif 포맷의 바이트로 순수 검증한다.
func TestFirstFrameBlurhash(t *testing.T) {
	gifBytes := buildGif(t, 300, 300, 4)

	hash, err := firstFrameBlurhash(gifBytes)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// (4,3) 컴포넌트(ADR D4, 이미지 전략과 동일) → 길이 28, size flag 문자 'L'로 시작.
	if len(hash) != 28 {
		t.Fatalf("blurhash length = %d, want 28 (hash=%q)", len(hash), hash)
	}
	if !strings.HasPrefix(hash, "L") {
		t.Fatalf("blurhash for (4,3) should start with 'L', got %q", hash)
	}
}

// 단일 프레임 gif(폴백 경로가 만드는 형태)에서도 blurhash가 성립해야 한다(ADR §3.3 폴백).
func TestFirstFrameBlurhashSingleFrame(t *testing.T) {
	gifBytes := buildGif(t, 300, 300, 1)

	hash, err := firstFrameBlurhash(gifBytes)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(hash) != 28 {
		t.Fatalf("blurhash length = %d, want 28", len(hash))
	}
}

// 깨진 입력은 200이 아니라 에러여야 한다(빈/실패 결과 방어, ADR §3.3).
func TestFirstFrameBlurhashRejectsInvalidGif(t *testing.T) {
	if _, err := firstFrameBlurhash([]byte("not a gif at all")); err == nil {
		t.Fatal("expected error for invalid gif bytes, got nil")
	}
}

// buildGif은 테스트용 유효 gif 바이트를 만든다(네트워크·ffmpeg 불필요).
func buildGif(t *testing.T, w, h, frames int) []byte {
	t.Helper()
	palette := color.Palette{
		color.RGBA{0, 0, 0, 255},
		color.RGBA{255, 0, 0, 255},
		color.RGBA{0, 255, 0, 255},
		color.RGBA{0, 0, 255, 255},
	}
	anim := &gif.GIF{}
	for f := 0; f < frames; f++ {
		img := image.NewPaletted(image.Rect(0, 0, w, h), palette)
		for y := 0; y < h; y++ {
			for x := 0; x < w; x++ {
				img.SetColorIndex(x, y, uint8((x+y+f)%len(palette)))
			}
		}
		anim.Image = append(anim.Image, img)
		anim.Delay = append(anim.Delay, 50) // 0.5초(ADR 재생 타이밍과 동일)
	}

	var buf bytes.Buffer
	if err := gif.EncodeAll(&buf, anim); err != nil {
		t.Fatalf("failed to build test gif: %v", err)
	}
	return buf.Bytes()
}
