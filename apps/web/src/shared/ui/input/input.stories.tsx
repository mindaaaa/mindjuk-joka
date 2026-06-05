import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Input } from './input';

const meta = {
  title: 'shared/ui/Input',
  component: Input,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: '설명을 입력하세요' },
};

export const Disabled: Story = {
  args: { placeholder: '비활성', disabled: true },
};

export const Typing: Story = {
  args: { placeholder: '입력', onChange: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByPlaceholderText('입력'), 'abc');
    await expect(args.onChange).toHaveBeenCalled();
  },
};
