/// <reference types="vite/client" />
import type { Preview } from '@storybook/react-vite';

import '../src/app/styles/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
  // 툴바에서 라이트/다크 전환.
  globalTypes: {
    theme: {
      description: '라이트/다크 미리보기',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, ctx) => (
      <div className={ctx.globals.theme === 'dark' ? 'dark' : undefined}>
        <div className="bg-background p-4 text-foreground">
          <Story />
        </div>
      </div>
    ),
  ],
};

export default preview;
