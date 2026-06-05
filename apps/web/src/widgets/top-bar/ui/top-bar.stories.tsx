import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { expect, within } from 'storybook/test';

import { TopBar } from './top-bar';

import { useAlbumStore } from '@/entities/album';
import { useAuthStore } from '@/features/auth';
import { usePhotoSelectStore } from '@/features/photo-select';

const meta = {
  title: 'widgets/TopBar',
  component: TopBar,
  parameters: { layout: 'fullscreen' },
  decorators: [
    // 스토리별 parameters.route로 현재 경로를 지정 → "선택"의 경로 게이팅 검증
    (Story, ctx) => (
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter
          initialEntries={[(ctx.parameters.route as string) ?? '/']}
        >
          <Story />
        </MemoryRouter>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof TopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 비로그인: JOKA + 테마 토글만 (선택/업로드/로그아웃 숨김). */
export const LoggedOut: Story = {
  async beforeEach() {
    useAuthStore.getState().reset();
    useAlbumStore.getState().clear();
  },
};

/**
 * 로그인(EDITOR) + 목록 경로(/photos): 우측 클러스터 = 선택 / 다크모드 / + (+로그아웃).
 */
export const EditorOnPhotoList: Story = {
  parameters: { route: '/photos' },
  async beforeEach() {
    usePhotoSelectStore.setState({ enabled: false, selectedIds: new Set() });
    useAuthStore.getState().setUser({
      id: 'u1',
      name: '홍길동',
      email: 'user@joka.app',
    });
    useAlbumStore.getState().setCurrent({
      id: 'a1',
      name: '테스트 앨범',
      role: 'EDITOR',
    });
    return () => {
      useAuthStore.getState().reset();
      useAlbumStore.getState().clear();
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 선택 토글 노출(목록 경로)
    await expect(
      canvas.getByRole('button', { name: '선택' }),
    ).toBeInTheDocument();
    // 업로드 FAB → /upload 와이어링
    await expect(
      canvas.getByRole('link', { name: '사진 올리기' }),
    ).toHaveAttribute('href', '/upload');
    // 로그아웃 노출
    await expect(
      canvas.getByRole('button', { name: '로그아웃' }),
    ).toBeInTheDocument();
  },
};

/** EDITOR + 비목록 경로(/upload): "선택"은 숨고 업로드 FAB만. */
export const EditorElsewhere: Story = {
  parameters: { route: '/upload' },
  async beforeEach() {
    useAuthStore.getState().setUser({
      id: 'u1',
      name: '홍길동',
      email: 'user@joka.app',
    });
    useAlbumStore.getState().setCurrent({
      id: 'a1',
      name: '테스트 앨범',
      role: 'EDITOR',
    });
    return () => {
      useAuthStore.getState().reset();
      useAlbumStore.getState().clear();
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole('button', { name: '선택' }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole('link', { name: '사진 올리기' }),
    ).toBeInTheDocument();
  },
};

/** VIEWER + 목록 경로: 선택은 보이지만 업로드 FAB는 숨김. */
export const ViewerOnPhotoList: Story = {
  parameters: { route: '/photos' },
  async beforeEach() {
    usePhotoSelectStore.setState({ enabled: false, selectedIds: new Set() });
    useAuthStore.getState().setUser({
      id: 'u2',
      name: '뷰어',
      email: 'viewer@joka.app',
    });
    useAlbumStore.getState().setCurrent({
      id: 'a1',
      name: '테스트 앨범',
      role: 'VIEWER',
    });
    return () => {
      useAuthStore.getState().reset();
      useAlbumStore.getState().clear();
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('button', { name: '선택' }),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole('link', { name: '사진 올리기' }),
    ).not.toBeInTheDocument();
  },
};
