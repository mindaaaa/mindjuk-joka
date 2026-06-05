import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { useThemeStore } from '../model/store';
import { ThemeToggle } from './theme-toggle';

const meta = {
  title: 'features/theme/ThemeToggle',
  component: ThemeToggle,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TogglesTheme: Story = {
  async beforeEach() {
    useThemeStore.getState().setTheme('light');
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button'));
    await expect(useThemeStore.getState().theme).toBe('dark');
    await expect(document.documentElement.classList.contains('dark')).toBe(
      true,
    );

    await userEvent.click(canvas.getByRole('button'));
    await expect(useThemeStore.getState().theme).toBe('light');
    await expect(document.documentElement.classList.contains('dark')).toBe(
      false,
    );
  },
};
