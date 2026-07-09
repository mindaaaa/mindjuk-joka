import type { Meta, StoryObj } from '@storybook/react-vite';

import { PhotoProgressiveImage } from './photo-progressive-image';

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
