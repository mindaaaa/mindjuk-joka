import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor } from 'storybook/test';

import { PhotoThumbnail } from './photo-thumbnail';

const BLURHASH = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';
const OK_SRC = 'https://placehold.co/300x300/png';
const BROKEN_SRC = 'https://placehold.co/broken-thumbnail-does-not-exist';

const meta = {
  title: 'entities/photo/PhotoThumbnail',
  component: PhotoThumbnail,
  parameters: { layout: 'centered' },
  args: { alt: '바닷가 사진', blurhash: BLURHASH },
  decorators: [
    (Story) => (
      // 목록 카드와 같은 폭(2열 메이슨리)에서 확인한다
      <div className="w-44">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PhotoThumbnail>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 정상: 썸네일이 로드되면 blurhash 위로 페이드인한다 */
export const Loaded: Story = {
  args: { src: OK_SRC },
};

/** 썸네일 URL이 아직 없는 상태(추출 전) — blurhash만 보인다 */
export const BlurhashOnly: Story = {
  args: { src: undefined },
};

/**
 * 로드 실패 + 재시도 성공
 * 실패하면 새 서명 URL을 받아 한 번 더 시도한다(만료된 presigned URL 등)
 */
export const RetrySucceeds: Story = {
  args: {
    src: BROKEN_SRC,
    onLoadError: fn(async () => OK_SRC),
  },
  play: async ({ args, canvas }) => {
    await waitFor(() => expect(args.onLoadError).toHaveBeenCalledWith(1));
    // 재시도로 받은 URL이 로드되면 실패 표시는 뜨지 않는다
    await waitFor(() =>
      expect(
        canvas.queryByLabelText('썸네일을 불러오지 못했어요'),
      ).not.toBeInTheDocument(),
    );
  },
};

/**
 * 로드 실패 + 재시도도 실패 (지금 프로덕션의 iOS 디코딩 불가 썸네일이 이 경우)
 * blurhash 위에 실패 아이콘을 얹어, 로딩 중으로 오해하지 않게 한다.
 */
export const Failed: Story = {
  args: {
    src: BROKEN_SRC,
    onLoadError: fn(async () => undefined),
  },
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(
        canvas.getByLabelText('썸네일을 불러오지 못했어요'),
      ).toBeInTheDocument(),
    );
  },
};

/** 핸들러가 없으면 재시도 없이 곧바로 실패로 확정한다 */
export const FailedWithoutHandler: Story = {
  args: { src: BROKEN_SRC },
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(
        canvas.getByLabelText('썸네일을 불러오지 못했어요'),
      ).toBeInTheDocument(),
    );
  },
};
