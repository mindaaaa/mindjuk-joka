import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, userEvent, within } from 'storybook/test';

import { RefreshButton } from './refresh-button';
import { usePhotoRefreshStore } from '../model/store';

const meta = {
  title: 'features/photo-refresh/RefreshButton',
  component: RefreshButton,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  async beforeEach() {
    usePhotoRefreshStore.setState({ isRefreshing: false });
    return () => usePhotoRefreshStore.setState({ isRefreshing: false });
  },
} satisfies Meta<typeof RefreshButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 진행 중에는 아이콘이 회전하고 버튼이 잠겨 중복 요청을 막는다. */
export const Refreshing: Story = {
  async beforeEach() {
    usePhotoRefreshStore.setState({ isRefreshing: true });
    return () => usePhotoRefreshStore.setState({ isRefreshing: false });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole('button', { name: '사진 목록 새로고침' }),
    ).toBeDisabled();
    await expect(canvas.getByRole('status')).toHaveTextContent(
      '사진 목록을 새로고침하는 중이에요',
    );
  },
};

/** 붙어 있는 목록 쿼리가 없어도 클릭은 즉시 끝나고, 완료가 스크린리더에 안내된다. */
export const AnnouncesCompletion: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole('button', { name: '사진 목록 새로고침' }),
    );

    await expect(canvas.getByRole('status')).toHaveTextContent(
      '사진 목록을 새로고침했어요',
    );
  },
};
