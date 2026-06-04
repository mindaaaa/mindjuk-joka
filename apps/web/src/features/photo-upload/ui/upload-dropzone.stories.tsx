import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { useUploadQueueStore } from '../model/store';

import { UploadDropzone } from './upload-dropzone';

const meta = {
  title: 'features/photo-upload/UploadDropzone',
  component: UploadDropzone,
  parameters: { layout: 'padded' },
  async beforeEach() {
    useUploadQueueStore.getState().reset();
    return () => useUploadQueueStore.getState().reset();
  },
} satisfies Meta<typeof UploadDropzone>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * 유효한 이미지 파일을 input에 업로드하면 store.items가 늘어나는지 검증.
 */
export const SelectFileEnqueues: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: '사진 추가' });
    await expect(button).toBeInTheDocument();

    const input = canvasElement.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await expect(input).not.toBeNull();

    const file = new File(['dummy'], 'landscape.jpg', { type: 'image/jpeg' });
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(useUploadQueueStore.getState().items).toHaveLength(1);
    });
    await expect(useUploadQueueStore.getState().items[0]?.file.name).toBe(
      'landscape.jpg',
    );
  },
};
