import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { Photo } from '../model/types';
import { PhotoCard } from './photo-card';

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
