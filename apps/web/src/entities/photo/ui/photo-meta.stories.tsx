import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import type { Photo } from '../model/types';
import { PhotoMeta } from './photo-meta';

const basePhoto: Photo = {
  id: 'p1',
  description: '조카 첫 돌 사진',
  state: 'COMPLETE',
  imageUrl: 'https://picsum.photos/seed/joka/600',
  downloadUrl: 'https://example.com/p1/download',
  mimeType: 'image/jpeg',
  size: 1536,
  isFavorite: true,
  createdAt: '2026-01-01T15:00:00.000Z',
  createdBy: { id: 'u1', name: '홍길동', email: 'user@joka.app' },
};

const meta = {
  title: 'entities/photo/PhotoMeta',
  component: PhotoMeta,
  args: { photo: basePhoto },
} satisfies Meta<typeof PhotoMeta>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/홍길동/)).toBeInTheDocument();
  },
};
