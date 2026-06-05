import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { Photo } from '@/entities/photo';

import { EditMetaForm } from './edit-meta-form';

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

const meta = {
  title: 'features/photo-edit-meta/EditMetaForm',
  component: EditMetaForm,
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  args: { photo: basePhoto, canEdit: true },
} satisfies Meta<typeof EditMetaForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// play 스텝을 눈으로 따라갈 수 있도록 관찰용 지연.
const pause = () => new Promise((resolve) => setTimeout(resolve, 400));

export const ReadOnly: Story = {
  args: { canEdit: false },

  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('조카 첫 돌 사진')).toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: '설명 편집' }),
    ).not.toBeInTheDocument();
  },
};

export const EditAndCancel: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup({ delay: 60 });

    await step('편집 모드 진입', async () => {
      await user.click(canvas.getByRole('button', { name: '설명 편집' }));
      const input = canvas.getByRole('textbox', { name: '사진 설명' });

      await expect(input).toHaveValue('조카 첫 돌 사진');
    });
    await pause();

    await step('설명 수정', async () => {
      const input = canvas.getByRole('textbox', { name: '사진 설명' });

      await user.clear(input);
      await user.type(input, '수정한 설명');

      await expect(input).toHaveValue('수정한 설명');
    });
    await pause();

    await step('취소 → view 모드 복귀 + 원래 값 복원', async () => {
      await user.click(canvas.getByRole('button', { name: '취소' }));
      await waitFor(() =>
        expect(canvas.getByText('조카 첫 돌 사진')).toBeInTheDocument(),
      );
    });
  },
};

export const ValidationError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '설명 편집' }));
    const input = canvas.getByRole('textbox', { name: '사진 설명' });
    await userEvent.clear(input);

    await expect(canvas.getByText('설명을 입력해 주세요.')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '저장' })).toBeDisabled();
  },
};
