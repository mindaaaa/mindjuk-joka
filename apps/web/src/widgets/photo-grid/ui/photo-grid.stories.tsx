import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { PhotoCard, type Photo } from '@/entities/photo';

import { PhotoGrid } from './photo-grid';

function makePhoto(id: string): Photo {
  return {
    id,
    description: `사진 ${id}`,
    state: 'COMPLETE',
    imageUrl: 'https://placehold.co/400x400',
    downloadUrl: 'https://placehold.co/400x400',
    mimeType: 'image/jpeg',
    size: 1000,
    isFavorite: false,
    createdAt: '2026-06-01T00:00:00.000Z',
    createdBy: { id: 'u1', name: '홍길동', email: 'user@joka.app' },
  };
}

const photos = Array.from({ length: 6 }, (_, i) => makePhoto(`p${i + 1}`));

const meta = {
  title: 'widgets/PhotoGrid',
  component: PhotoGrid,
  parameters: { layout: 'fullscreen' },
  args: {
    photos,
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    onLoadMore: () => {},
    renderCard: (photo: Photo) => <PhotoCard key={photo.id} photo={photo} />,
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PhotoGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithCards: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('button', { name: '사진 p1' }),
    ).toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: { isLoading: true },
};

export const Empty: Story = {
  args: { photos: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText('아직 올라온 사진이 없어요'),
    ).toBeInTheDocument();
  },
};
