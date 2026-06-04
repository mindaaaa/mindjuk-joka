import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { ApiError } from '@/shared/api/error';
import { errorFallbackMessage } from '@/shared/lib/error-fallback';

import { ErrorState } from './error-state';

const meta = {
  title: 'shared/ui/ErrorState',
  component: ErrorState,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

const retry = { label: '다시 시도', onClick: () => {} };

/** 네트워크 에러(status 0 / NETWORK) */
export const Network: Story = {
  args: {
    title: '사진을 불러오지 못했어요',
    description: errorFallbackMessage(
      new ApiError({ status: 0, code: 'NETWORK' }),
    ),
    retry,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText('인터넷 연결을 확인해 주세요'),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: '다시 시도' }),
    ).toBeInTheDocument();
  },
};

/** 서버 에러(5xx). */
export const Server: Story = {
  args: {
    title: '사진을 불러오지 못했어요',
    description: errorFallbackMessage(new ApiError({ status: 500 })),
    retry,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText('일시적인 문제가 발생했어요'),
    ).toBeInTheDocument();
  },
};

/** 그 외 일반 에러(예: 400). */
export const Generic: Story = {
  args: {
    title: '사진을 불러오지 못했어요',
    description: errorFallbackMessage(new ApiError({ status: 400 })),
    retry,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText('잠시 후 다시 시도해 주세요'),
    ).toBeInTheDocument();
  },
};

/** 전체 풀백(min-h-screen 중앙) */
export const FullPage: Story = {
  args: {
    fill: 'screen',
    title: '페이지를 불러오지 못했어요',
    description: errorFallbackMessage(new ApiError({ status: 500 })),
    retry,
    secondary: { label: '처음으로', onClick: () => {} },
  },
};

export const Retrying: Story = {
  args: {
    title: '페이지를 불러오지 못했어요',
    description: errorFallbackMessage(new ApiError({ status: 500 })),
    retry: { label: '다시 시도', onClick: () => {}, pending: true },
  },
};
