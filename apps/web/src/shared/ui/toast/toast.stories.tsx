import type { Meta, StoryObj } from '@storybook/react-vite';

import { TOAST_DURATION, toast } from './toast';
import { Toaster } from './toaster';

import { Button } from '@/shared/ui/button';

const meta: Meta<typeof Toaster> = {
  title: 'shared/ui/Toast',
  component: Toaster,
  parameters: { layout: 'centered' },
  decorators: [
    (Story, ctx) => (
      <>
        <Toaster theme={ctx.globals.theme === 'dark' ? 'dark' : 'light'} />
        <Story />
      </>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** 유형별 색·아이콘과 노출 시간을 한 화면에서 비교한다. 툴바 Theme으로 라이트/다크를 확인한다. */
export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => toast.success('사진을 삭제했어요.')}
        >
          성공 {TOAST_DURATION.success / 1000}초
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.info('이미 삭제된 사진이에요.')}
        >
          안내 {TOAST_DURATION.info / 1000}초
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.warning('3장 완료 · 1장 실패')}
        >
          경고 {TOAST_DURATION.warning / 1000}초
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.error('삭제에 실패했어요.')}
        >
          실패 {TOAST_DURATION.error / 1000}초
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        실패 토스트만 닫기 버튼이 있고, 가장 오래 노출된다.
      </p>
    </div>
  ),
};

/** 실패 토스트: 6초 노출 + 사용자가 직접 닫을 수 있다. */
export const Error: Story = {
  render: () => (
    <Button
      variant="destructive"
      onClick={() => toast.error('삭제에 실패했어요.')}
    >
      실패 토스트 띄우기
    </Button>
  ),
};

/** 성공 토스트: 3초 후 자동으로 사라진다. */
export const Success: Story = {
  render: () => (
    <Button onClick={() => toast.success('사진을 삭제했어요.')}>
      성공 토스트 띄우기
    </Button>
  ),
};

/** 여러 개가 쌓였을 때의 정렬·간격을 본다. */
export const Stacked: Story = {
  render: () => (
    <Button
      variant="outline"
      onClick={() => {
        toast.success('사진을 삭제했어요.');
        toast.warning('3장 완료 · 1장 실패');
        toast.error('삭제에 실패했어요.');
      }}
    >
      한꺼번에 띄우기
    </Button>
  ),
};
