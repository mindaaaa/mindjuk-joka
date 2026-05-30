import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from './alert';

const meta = {
  title: 'shared/ui/Alert',
  component: Alert,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Alert className="max-w-md">
      <AlertCircle />
      <AlertTitle>알림</AlertTitle>
      <AlertDescription>새로운 메시지를 받았어요.</AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive" className="max-w-md">
      <AlertCircle />
      <AlertTitle>오류</AlertTitle>
      <AlertDescription>요청에 실패했어요. 잠시 후 다시 시도해주세요.</AlertDescription>
    </Alert>
  ),
};
