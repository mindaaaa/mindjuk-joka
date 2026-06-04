import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { Photo } from '@/entities/photo';

import { DownloadButton } from './download-button';

const basePhoto: Photo = {
  id: 'p1',
  description: '조카 첫 돌 사진',
  state: 'COMPLETE',
  imageUrl: 'https://picsum.photos/seed/joka/600',
  downloadUrl: 'https://example.com/p1/download',
  mimeType: 'image/jpeg',
  size: 1536,
  isFavorite: false,
  createdAt: '2026-01-01T15:00:00.000Z',
  createdBy: { id: 'u1', name: '홍길동', email: 'user@joka.app' },
};

// downloadUrl 없는 사진 (exactOptionalPropertyTypes: 키 생략)
const { downloadUrl, ...photoWithoutDownload } = basePhoto;

const meta = {
  title: 'features/photo-download/DownloadButton',
  component: DownloadButton,
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  args: { photo: basePhoto },
} satisfies Meta<typeof DownloadButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 상단바 아이콘(ghost) 형태. */
export const Icon: Story = {
  args: { variant: 'ghost', size: 'icon' },
};

/** 하단 행 secondary 형태. */
export const Secondary: Story = {
  args: { variant: 'secondary', size: 'default' },
};

/** downloadUrl이 없으면 비활성화. */
export const Disabled: Story = {
  args: { photo: photoWithoutDownload },

  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('button', { name: '다운로드' }),
    ).toBeDisabled();
  },
};

export const ClickTogglesBusy: Story = {
  args: { variant: 'ghost', size: 'icon' },
  beforeEach: () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => ({
      ok: true,
      blob: async () => new Blob(['x']),
    })) as unknown as typeof fetch;
    return () => {
      globalThis.fetch = originalFetch;
    };
  },

  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: '다운로드' });
    await expect(button).toBeEnabled();

    await userEvent.click(button);

    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'false'));
    await expect(button).toBeEnabled();
  },
};
