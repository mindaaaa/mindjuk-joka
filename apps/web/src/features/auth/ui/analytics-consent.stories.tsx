import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { AnalyticsConsent } from './analytics-consent';

const meta = {
  title: 'features/auth/AnalyticsConsent',
  component: AnalyticsConsent,
  args: { checked: false, onCheckedChange: () => {} },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof AnalyticsConsent>;

export default meta;
type Story = StoryObj<typeof meta>;

function ControlledConsent() {
  const [checked, setChecked] = useState(false);
  return <AnalyticsConsent checked={checked} onCheckedChange={setChecked} />;
}

// 기본: 미체크 상태로 시작
export const Default: Story = {
  render: () => <ControlledConsent />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('checkbox')).toHaveAttribute(
      'aria-checked',
      'false',
    );
  },
};

// 체크 토글 동작
export const Checked: Story = {
  render: () => <ControlledConsent />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('checkbox'));
    await expect(canvas.getByRole('checkbox')).toHaveAttribute(
      'aria-checked',
      'true',
    );
  },
};

// 자세히(i) 클릭 시 안내 팝오버 노출
export const WithTooltip: Story = {
  render: () => <ControlledConsent />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '자세히' }));
    await expect(canvas.getByRole('tooltip')).toBeInTheDocument();
  },
};
