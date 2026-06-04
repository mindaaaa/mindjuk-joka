import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { usePhotoSelectStore } from '../model/store';
import { SelectToggle } from './select-toggle';

const meta = {
  title: 'features/photo-select/SelectToggle',
  component: SelectToggle,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SelectToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  async beforeEach() {
    usePhotoSelectStore.setState({ enabled: false, selectedIds: new Set() });
    return () =>
      usePhotoSelectStore.setState({ enabled: false, selectedIds: new Set() });
  },
};

export const TogglesMode: Story = {
  async beforeEach() {
    usePhotoSelectStore.setState({ enabled: false, selectedIds: new Set() });
    return () =>
      usePhotoSelectStore.setState({ enabled: false, selectedIds: new Set() });
  },

  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '선택' }));
    await expect(usePhotoSelectStore.getState().enabled).toBe(true);
    await expect(
      canvas.getByRole('button', { name: '해제' }),
    ).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: '해제' }));
    await expect(usePhotoSelectStore.getState().enabled).toBe(false);
  },
};
