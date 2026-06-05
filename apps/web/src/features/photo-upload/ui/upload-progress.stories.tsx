import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { UploadProgress } from './upload-progress';

const meta = {
  title: 'features/photo-upload/UploadProgress',
  component: UploadProgress,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UploadProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { value: 0 },
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement).getByRole('progressbar');
    await expect(bar).toHaveAttribute('aria-valuenow', '0');
  },
};

export const Half: Story = {
  args: { value: 50 },
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement).getByRole('progressbar');
    await expect(bar).toHaveAttribute('aria-valuenow', '50');
  },
};

export const Full: Story = {
  args: { value: 100 },
  play: async ({ canvasElement }) => {
    const bar = within(canvasElement).getByRole('progressbar');
    await expect(bar).toHaveAttribute('aria-valuenow', '100');
  },
};
