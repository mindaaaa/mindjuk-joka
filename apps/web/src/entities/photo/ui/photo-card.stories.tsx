import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { PhotoCard } from './photo-card';
import type { Photo } from '../model/types';

const fixturePhoto: Photo = {
  id: 'p1',
  description: '바닷가 사진',
  state: 'COMPLETE',
  imageUrl: 'https://placehold.co/400x400',
  downloadUrl: 'https://placehold.co/400x400',
  mimeType: 'image/jpeg',
  size: 12345,
  isFavorite: false,
  createdAt: '2026-06-01T00:00:00.000Z',
  createdBy: { id: 'u1', name: '홍길동', email: 'user@joka.app' },
};

const meta = {
  title: 'entities/photo/PhotoCard',
  component: PhotoCard,
  parameters: { layout: 'centered' },
  args: { photo: fixturePhoto },
  decorators: [
    (Story) => (
      <div className="w-44">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PhotoCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * 썸네일 추출 완료 상태
 * - 목록은 경량 thumbnailUrl 사용
 * - 로드 전 blurhash placeholder가 깔림
 */
export const WithThumbnail: Story = {
  args: {
    photo: {
      ...fixturePhoto,
      thumbnailUrl: 'https://placehold.co/200x200/1d4ed8/fff?text=thumb',
      blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
    },
  },
  // 썸네일이 있으면 목록 이미지가 원본이 아니라 썸네일 accessUrl을 쓴다
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const img = canvas.getByRole('img', { name: '바닷가 사진' });
    await expect(img).toHaveAttribute('src', args.photo.thumbnailUrl);
    await expect(img).not.toHaveAttribute('src', args.photo.imageUrl);
  },
};

/**
 * 썸네일 추출 전(비동기 대기)
 * - thumbnailUrl이 없어 원본 imageUrl로 폴백.
 * - fixturePhoto에는 썸네일 키가 없으므로 그대로 사용한다.
 */
export const ThumbnailPending: Story = {
  args: { photo: fixturePhoto },
  // 썸네일이 없으면 원본 imageUrl로 폴백해 여전히 표시된다
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const img = canvas.getByRole('img', { name: '바닷가 사진' });
    await expect(img).toHaveAttribute('src', args.photo.imageUrl);
  },
};

export const Selected: Story = {
  args: {
    selected: true,
    selectionSlot: (
      <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
        ✓
      </span>
    ),
  },
};

/** actionSlot(다운로드 등)을 우하단에 렌더. */
export const WithAction: Story = {
  args: {
    actionSlot: (
      <button type="button" className="rounded-md bg-card px-2 py-1 text-xs">
        받기
      </button>
    ),
  },
};

export const OpensOnClick: Story = {
  args: { onOpen: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '바닷가 사진' }));
    await expect(args.onOpen).toHaveBeenCalledWith('p1');
  },
};
