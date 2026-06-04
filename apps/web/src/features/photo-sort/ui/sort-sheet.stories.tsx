import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';

import { usePhotoSortStore } from '../model/store';
import { SortSheet } from './sort-sheet';

const meta = {
  title: 'features/photo-sort/SortSheet',
  component: SortSheet,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SortSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  async beforeEach() {
    usePhotoSortStore.setState({ order: 'desc' });
  },
};

export const SelectOldest: Story = {
  async beforeEach() {
    usePhotoSortStore.setState({ order: 'desc' });
    return () => usePhotoSortStore.setState({ order: 'desc' });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: /최신/ }));

    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: '오래된순' }));

    await expect(usePhotoSortStore.getState().order).toBe('asc');
  },
};

export const SelectNewest: Story = {
  async beforeEach() {
    usePhotoSortStore.setState({ order: 'asc' });
    return () => usePhotoSortStore.setState({ order: 'desc' });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: /오래된순/ }));

    const dialog = within(await screen.findByRole('dialog')); // 다이얼로그는 Radix Portal로 body에 렌더됨 → canvas 밖이라 screen으로 조회
    await userEvent.click(dialog.getByRole('button', { name: '최신순' }));

    await expect(usePhotoSortStore.getState().order).toBe('desc');
  },
};
