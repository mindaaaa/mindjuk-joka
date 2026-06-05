import { beforeAll } from 'vitest';
import { setProjectAnnotations } from '@storybook/react-vite';

import * as projectAnnotations from './preview';

// preview 설정을 테스트에 연결 (없으면 스토리 렌더링 실패)
const project = setProjectAnnotations([projectAnnotations]);

beforeAll(project.beforeAll);
