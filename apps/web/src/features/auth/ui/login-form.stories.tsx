import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { LoginForm } from './login-form';

const meta = {
  title: 'features/auth/LoginForm',
  component: LoginForm,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  // 클릭하면 페이지가 실제로 이동해버려서, 클릭 말고 렌더만 검증
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole('button', { name: '카카오로 시작하기' }),
    ).toBeInTheDocument();
  },
};
