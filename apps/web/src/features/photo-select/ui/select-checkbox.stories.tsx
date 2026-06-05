import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { usePhotoSelectStore } from '../model/store';
import { SelectCheckbox } from './select-checkbox';

const meta = {
  title: 'features/photo-select/SelectCheckbox',
  component: SelectCheckbox,
  parameters: { layout: 'centered' },
  args: { id: 'p1' },
} satisfies Meta<typeof SelectCheckbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unselected: Story = {
  async beforeEach() {
    usePhotoSelectStore.setState({ enabled: true, selectedIds: new Set() });
    return () =>
      usePhotoSelectStore.setState({ enabled: false, selectedIds: new Set() });
  },
};

export const Selected: Story = {
  async beforeEach() {
    usePhotoSelectStore.setState({
      enabled: true,
      selectedIds: new Set(['p1']),
    });
    return () =>
      usePhotoSelectStore.setState({ enabled: false, selectedIds: new Set() });
  },
};

export const TogglesSelection: Story = {
  async beforeEach() {
    usePhotoSelectStore.setState({ enabled: true, selectedIds: new Set() });
    return () =>
      usePhotoSelectStore.setState({ enabled: false, selectedIds: new Set() });
  },

  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('checkbox'));
    await expect(usePhotoSelectStore.getState().selectedIds.has('p1')).toBe(
      true,
    );

    await userEvent.click(canvas.getByRole('checkbox'));
    await expect(usePhotoSelectStore.getState().selectedIds.has('p1')).toBe(
      false,
    );
  },
};
