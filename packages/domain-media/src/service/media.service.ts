import { NotImplementedException } from '@joka/core/src/exception';

export const create = async (): Promise<never> => {
  throw new NotImplementedException(`MEDIA_SERVICE_NOT_IMPLEMENTED`, [
    `구현되지 않은 API입니다.`,
    `관리자에게 문의하세요.`,
  ]);
};

export const list = async (): Promise<never> => {
  throw new NotImplementedException(`MEDIA_SERVICE_NOT_IMPLEMENTED`, [
    `구현되지 않은 API입니다.`,
    `관리자에게 문의하세요.`,
  ]);
};

export const get = async (): Promise<never> => {
  throw new NotImplementedException(`MEDIA_SERVICE_NOT_IMPLEMENTED`, [
    `구현되지 않은 API입니다.`,
    `관리자에게 문의하세요.`,
  ]);
};

export const update = async (): Promise<never> => {
  throw new NotImplementedException(`MEDIA_SERVICE_NOT_IMPLEMENTED`, [
    `구현되지 않은 API입니다.`,
    `관리자에게 문의하세요.`,
  ]);
};

export const remove = async (): Promise<never> => {
  throw new NotImplementedException(`MEDIA_SERVICE_NOT_IMPLEMENTED`, [
    `구현되지 않은 API입니다.`,
    `관리자에게 문의하세요.`,
  ]);
};
