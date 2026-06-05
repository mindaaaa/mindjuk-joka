import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { usePhotoSelectStore } from '@/features/photo-select';

import { SelectionBar } from './selection-bar';

const meta = {
  title: 'widgets/SelectionBar',
  component: SelectionBar,
  parameters: { layout: 'fullscreen' },
  args: { onDownload: fn() },
} satisfies Meta<typeof SelectionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSelection: Story = {
  async beforeEach() {
    usePhotoSelectStore.setState({
      enabled: true,
      selectedIds: new Set(['p1', 'p2']),
    });
    return () =>
      usePhotoSelectStore.setState({ enabled: false, selectedIds: new Set() });
  },
};

export const TriggersDownload: Story = {
  async beforeEach() {
    usePhotoSelectStore.setState({
      enabled: true,
      selectedIds: new Set(['p1', 'p2']),
    });
    return () =>
      usePhotoSelectStore.setState({ enabled: false, selectedIds: new Set() });
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: /다운로드/ }));
    await expect(args.onDownload).toHaveBeenCalled();
  },
};

export const ClearsSelection: Story = {
  async beforeEach() {
    usePhotoSelectStore.setState({
      enabled: true,
      selectedIds: new Set(['p1', 'p2']),
    });
    return () =>
      usePhotoSelectStore.setState({ enabled: false, selectedIds: new Set() });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '선택 해제' }));
    await expect(usePhotoSelectStore.getState().selectedIds.size).toBe(0);
  },
};
