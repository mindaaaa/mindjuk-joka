import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';

import { AlbumCard } from './album-card';

import type { Album } from '@/entities/album';

const editable: Album = { id: '1', name: '민준이네 가족', role: 'EDITOR' };
const viewer: Album = { id: '2', name: '외갓집 사진첩', role: 'VIEWER' };

const constrainWidth: Decorator = (Story) => (
  <div style={{ maxWidth: 360 }}>
    <Story />
  </div>
);

const meta = {
  title: 'pages/AlbumSelect/AlbumCard',
  component: AlbumCard,
  parameters: { layout: 'padded' },
  decorators: [constrainWidth],
  args: {
    isMain: false,
    isSelected: false,
    onSelect: () => {},
    onToggleMain: () => {},
  },
} satisfies Meta<typeof AlbumCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Editable: Story = { args: { album: editable } };

export const Viewer: Story = { args: { album: viewer } };

export const MainStarred: Story = { args: { album: editable, isMain: true } };

export const Selected: Story = { args: { album: editable, isSelected: true } };

export const LongName: Story = {
  args: {
    album: {
      id: '3',
      name: '정말 길고 긴 우리 가족 사진첩 이름 테스트용',
      role: 'ADMIN',
    },
  },
};
