import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';

import { PhotoProgressiveImage } from './photo-progressive-image';

// 네트워크 없이도 반드시 로드되는 이미지(재시도 성공을 결정적으로 재현하기 위함)
const OK_SRC =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800'%3E%3Crect width='800' height='800' fill='%231d4ed8'/%3E%3C/svg%3E";
const BROKEN_SRC = 'https://placehold.co/broken-original-does-not-exist';

const meta = {
  title: 'entities/photo/PhotoProgressiveImage',
  component: PhotoProgressiveImage,
  parameters: { layout: 'centered' },
  args: {
    src: 'https://placehold.co/800x800/222/fff?text=original',
    previewSrc: 'https://placehold.co/300x300/1d4ed8/fff?text=thumb',
    blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
    alt: '바닷가 사진',
  },
  // 상세 뷰어와 동일한 정사각형 다크 스테이지를 흉내 낸다
  decorators: [
    (Story) => (
      <div className="relative flex aspect-square w-72 items-center justify-center overflow-hidden rounded-2xl bg-black">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PhotoProgressiveImage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 3단계 모두 제공(원본까지 로드되면 최종 표시) */
export const Default: Story = {};

/** 원본 로드 전 단계(썸네일 프리뷰가 blurhash 위에 표시) */
export const PreviewOverBlur: Story = {
  args: { src: undefined },
};

/** 썸네일도 없을 때(blurhash placeholder만) */
export const BlurhashOnly: Story = {
  args: { src: undefined, previewSrc: undefined },
};

/**
 * 원본 로드 실패 + 재시도 성공
 * - 만료된 presigned URL로 요청이 나간 경우, 새 서명 URL을 받아 자동으로 살아난다.
 */
export const RetrySucceeds: Story = {
  args: {
    src: BROKEN_SRC,
    onLoadError: fn(async () => OK_SRC),
  },
  play: async ({ args, canvas }) => {
    await waitFor(() => expect(args.onLoadError).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(
        canvas.queryByText('사진을 불러오지 못했어요'),
      ).not.toBeInTheDocument(),
    );
  },
};

/** 원본 로드 실패 + 재시도도 실패 → 실패 문구와 수동 재시도 버튼을 노출한다 */
export const Failed: Story = {
  args: {
    src: BROKEN_SRC,
    onLoadError: fn(async () => undefined),
  },
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByText('사진을 불러오지 못했어요')).toBeInTheDocument(),
    );
    await expect(
      canvas.getByRole('button', { name: '다시 불러오기' }),
    ).toBeInTheDocument();
  },
};

/** 실패 후 버튼을 누르면 다시 URL을 요청하고, 살아나면 실패 표시가 사라진다 */
let manualRetryCalls = 0;

export const ManualRetry: Story = {
  beforeEach: () => {
    manualRetryCalls = 0;
  },
  args: {
    src: BROKEN_SRC,
    // 첫 시도(자동)는 새 URL을 못 받고, 버튼으로 누른 재시도에서 받아온다
    onLoadError: fn(async () =>
      ++manualRetryCalls === 1 ? undefined : OK_SRC,
    ),
  },
  play: async ({ canvas }) => {
    const button = await waitFor(() =>
      canvas.getByRole('button', { name: '다시 불러오기' }),
    );
    await userEvent.click(button);

    await waitFor(() =>
      expect(
        canvas.queryByText('사진을 불러오지 못했어요'),
      ).not.toBeInTheDocument(),
    );
  },
};
