import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { useUploadQueueStore } from '../model/store';
import type { UploadQueueItem } from '../model/types';

import { UploadItem } from './upload-item';

function makeFixture(
  overrides: Partial<UploadQueueItem> = {},
): UploadQueueItem {
  return {
    id: 'fixture-1',
    file: new File(['x'], 'landscape.jpg', { type: 'image/jpeg' }),
    description: '바다 풍경',
    status: 'pending',
    progress: 0,
    retryCount: 0,
    ...overrides,
  };
}

/** store에 동일 id 아이템을 넣어 remove/retry 같은 store 액션이 반영되게 함. */
function seedStore(item: UploadQueueItem) {
  useUploadQueueStore.setState({ items: [item], isRunning: false });
}

const meta = {
  title: 'features/photo-upload/UploadItem',
  component: UploadItem,
  parameters: { layout: 'padded' },
  async beforeEach() {
    useUploadQueueStore.getState().reset();
    return () => useUploadQueueStore.getState().reset();
  },
} satisfies Meta<typeof UploadItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {
  args: { item: makeFixture() },
  async beforeEach() {
    seedStore(makeFixture());
  },
};

export const Selected: Story = {
  args: { item: makeFixture(), selected: true },
  async beforeEach() {
    seedStore(makeFixture());
  },
};

export const Uploading: Story = {
  args: { item: makeFixture({ status: 'uploading', progress: 65 }) },
  async beforeEach() {
    seedStore(makeFixture({ status: 'uploading', progress: 65 }));
  },
};

export const Success: Story = {
  args: { item: makeFixture({ status: 'success', progress: 100 }) },
  async beforeEach() {
    seedStore(makeFixture({ status: 'success', progress: 100 }));
  },
};

export const ErrorState: Story = {
  args: {
    item: makeFixture({ status: 'error', errorMessage: '업로드에 실패했어요' }),
  },
  async beforeEach() {
    seedStore(
      makeFixture({ status: 'error', errorMessage: '업로드에 실패했어요' }),
    );
  },
};

export const SelectClick: Story = {
  args: { item: makeFixture(), onSelect: fn() },
  async beforeEach() {
    seedStore(makeFixture());
  },

  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole('button', { name: 'landscape.jpg 선택' }),
    );
    await expect(args.onSelect).toHaveBeenCalledWith('fixture-1');
  },
};

export const RemovePending: Story = {
  args: { item: makeFixture() },
  async beforeEach() {
    seedStore(makeFixture());
  },

  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '삭제' }));
    await waitFor(() => {
      expect(useUploadQueueStore.getState().items).toHaveLength(0);
    });
  },
};

export const CancelUploading: Story = {
  args: {
    item: makeFixture({ status: 'uploading', progress: 30 }),
    onCancel: fn(),
  },

  async beforeEach() {
    seedStore(makeFixture({ status: 'uploading', progress: 30 }));
  },

  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '취소' }));
    await expect(args.onCancel).toHaveBeenCalledWith('fixture-1');
  },
};

export const RetryError: Story = {
  args: {
    item: makeFixture({ status: 'error', errorMessage: '업로드에 실패했어요' }),
  },
  async beforeEach() {
    seedStore(
      makeFixture({ status: 'error', errorMessage: '업로드에 실패했어요' }),
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '재시도' }));
    await waitFor(() => {
      expect(useUploadQueueStore.getState().items[0]?.status).toBe('pending');
    });
  },
};
