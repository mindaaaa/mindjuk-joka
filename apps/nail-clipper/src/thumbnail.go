package main

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image/gif"
	"math"
	"os/exec"
	"strconv"
	"strings"

	blurhash "github.com/buckket/go-blurhash"
)

// distroless엔 PATH·셸이 없으므로 바이너리를 절대경로로 exec한다(ADR §3.4).
const (
	ffmpegBin  = "/usr/local/bin/ffmpeg"
	ffprobeBin = "/usr/local/bin/ffprobe"
)

const (
	// 앞 10초만 처리 → 대용량 영상도 20초 예산 방어(ADR §3.3 `-t 10`).
	processWindow = 10.0
	// 영상 길이와 무관하게 항상 ~4프레임(ADR §3.3 적응형 fps).
	targetFrames = 4.0
	// blurhash 컴포넌트 — 이미지 전략과 동일(x=4, y=3, ADR D4).
	blurhashX = 4
	blurhashY = 3
)

// generateThumbnail은 presigned URL로부터 300x300 cover gif와 첫 프레임 blurhash를 만든다.
func generateThumbnail(ctx context.Context, sourceURL string) ([]byte, string, error) {
	var gifBytes []byte

	duration, probeErr := probeDuration(ctx, sourceURL)
	if probeErr != nil {
		// 폴백: duration 미상(스트리밍/degenerate) → 단일 프레임 gif(ADR §3.3 폴백).
		var err error
		gifBytes, err = encodeSingleFrameGif(ctx, sourceURL)
		if err != nil {
			return nil, "", fmt.Errorf("fallback single-frame gif failed (probe: %v): %w", probeErr, err)
		}
	} else {
		fps := adaptiveFps(duration)
		var err error
		gifBytes, err = encodeAdaptiveGif(ctx, sourceURL, fps)
		if err != nil {
			return nil, "", fmt.Errorf("gif encode failed: %w", err)
		}
	}

	if len(gifBytes) == 0 {
		return nil, "", errors.New("empty gif")
	}

	hash, err := firstFrameBlurhash(gifBytes)
	if err != nil {
		return nil, "", fmt.Errorf("blurhash failed: %w", err)
	}
	return gifBytes, hash, nil
}

// adaptiveFps는 영상 길이와 무관하게 처리 윈도우(<=10초) 안에서 항상 ~4프레임이 나오도록
// fps를 정한다: window = min(d, 10), fps = 4 / window(ADR §3.3 적응형 fps).
func adaptiveFps(duration float64) float64 {
	window := math.Min(duration, processWindow)
	return targetFrames / window
}

// probeDuration은 ffprobe로 영상 길이(초)를 얻는다.
func probeDuration(ctx context.Context, sourceURL string) (float64, error) {
	cmd := exec.CommandContext(ctx, ffprobeBin,
		"-v", "error",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		sourceURL,
	)
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return 0, err
	}

	d, err := strconv.ParseFloat(strings.TrimSpace(out.String()), 64)
	if err != nil || d <= 0 {
		return 0, fmt.Errorf("invalid duration %q", strings.TrimSpace(out.String()))
	}
	return d, nil
}

// encodeAdaptiveGif은 적응형 fps로 cover 300x300 gif를 stdout에서 버퍼로 받는다.
// settb=1/2,setpts=N: 샘플링과 재생 타이밍을 분리 → 프레임당 0.5초, 2초 루프로 균일.
// (ADR §3.3의 setpts=N/(2*TB)는 ffmpeg 7.x에서 프레임이 1개로 붕괴 → step1 실측으로 교체.)
func encodeAdaptiveGif(ctx context.Context, sourceURL string, fps float64) ([]byte, error) {
	vf := fmt.Sprintf(
		"fps=%s,scale=300:300:force_original_aspect_ratio=increase,crop=300:300,settb=1/2,setpts=N",
		strconv.FormatFloat(fps, 'f', 6, 64),
	)
	return runFfmpegGif(ctx,
		"-v", "error",
		"-t", "10",
		"-i", sourceURL,
		"-vf", vf,
		"-loop", "0",
		"-f", "gif",
		"pipe:1",
	)
}

// encodeSingleFrameGif은 duration을 못 얻은 입력에 대한 단일 프레임 폴백이다.
func encodeSingleFrameGif(ctx context.Context, sourceURL string) ([]byte, error) {
	return runFfmpegGif(ctx,
		"-v", "error",
		"-t", "10",
		"-i", sourceURL,
		"-frames:v", "1",
		"-vf", "scale=300:300:force_original_aspect_ratio=increase,crop=300:300",
		"-f", "gif",
		"pipe:1",
	)
}

// runFfmpegGif은 인자 슬라이스로 ffmpeg를 실행(셸 주입 차단)하고 stdout gif 바이트를 반환한다.
func runFfmpegGif(ctx context.Context, args ...string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, ffmpegBin, args...)
	var out, stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("%w: %s", err, strings.TrimSpace(stderr.String()))
	}
	return out.Bytes(), nil
}

// firstFrameBlurhash은 생성된 gif의 첫 프레임을 디코드해 blurhash를 인코딩한다(ADR D4).
func firstFrameBlurhash(gifBytes []byte) (string, error) {
	decoded, err := gif.DecodeAll(bytes.NewReader(gifBytes))
	if err != nil {
		return "", err
	}
	if len(decoded.Image) == 0 {
		return "", errors.New("gif has no frames")
	}

	// *image.Paletted은 image.Image를 구현하므로 그대로 인코딩한다.
	return blurhash.Encode(blurhashX, blurhashY, decoded.Image[0])
}
