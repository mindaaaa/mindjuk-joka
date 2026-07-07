import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import { AlbumSelectPage } from './page';

import { albumKeys, type Album } from '@/entities/album';

const ALBUMS: Album[] = [
  { id: '1', name: '민준이네 가족', role: 'EDITOR' },
  { id: '2', name: '외갓집 사진첩', role: 'VIEWER' },
  { id: '3', name: '이모네랑 함께', role: 'ADMIN' },
  { id: '4', name: '돌잔치 기록', role: 'VIEWER' },
];

// MSW 대신 story별로 fetch/캐시를 직접 제어
function withClient(seed?: (queryClient: QueryClient) => void): Decorator {
  return (Story) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    seed?.(queryClient);
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/albums']}>
          <Story />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

const seededWith = (data: Album[]) => (queryClient: QueryClient) => {
  queryClient.setQueryData(albumKeys.list(), data);
};

const meta = {
  title: 'pages/AlbumSelect/Page',
  component: AlbumSelectPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AlbumSelectPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Multiple: Story = {
  name: 'Multiple Albums',
  decorators: [withClient(seededWith(ALBUMS))],
};

export const Single: Story = {
  name: 'Single Album',
  decorators: [withClient(seededWith([ALBUMS[0]]))],
};

export const Empty: Story = {
  name: 'Empty State',
  decorators: [withClient(seededWith([]))],
};

export const Loading: Story = {
  name: 'Loading State',
  decorators: [withClient()],
  async beforeEach() {
    const originalFetch = window.fetch;
    // pending 상태를 영구 유지해 로딩 UI를 고정
    window.fetch = () => new Promise<Response>(() => {});
    return () => {
      window.fetch = originalFetch;
    };
  },
};

export const Errored: Story = {
  name: 'Error State',
  decorators: [withClient()],
  async beforeEach() {
    const originalFetch = window.fetch;

    window.fetch = () => Promise.reject(new Error('network unavailable'));
    return () => {
      window.fetch = originalFetch;
    };
  },
};
