import { UnauthorizedException } from '@joka/core/src/exception';
import { Email } from '@joka/core/src/model/Email';
import { Url } from '@joka/core/src/model/Url';

import { UserInfo } from '../../domain/UserInfo';

interface KakaoConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

interface KakaoUserResponse {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
    };
  };
}

const KakaoOauthEndpoint = Url.from('https://kauth.kakao.com/oauth/token');
const KakaoMeEndpoint = Url.from('https://kapi.kakao.com/v2/user/me');

export class KakaoAuthClient {
  async exchangeCode(code: string, config: KakaoConfig): Promise<string> {
    const response = await fetch(KakaoOauthEndpoint.fullPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code,
      }).toString(),
    });
    if (!response.ok) {
      throw new UnauthorizedException('KAKAO_TOKEN_EXCHANGE_FAILED', [
        '카카오 인증 코드 교환에 실패했습니다.',
      ]);
    }

    const data = await response.json();

    return (data as KakaoTokenResponse).access_token;
  }

  async getUserInfo(kakaoAccessToken: string): Promise<UserInfo> {
    const response = await fetch(KakaoMeEndpoint.fullPath, {
      method: 'GET',
      headers: { Authorization: `Bearer ${kakaoAccessToken}` },
    });
    if (!response.ok) {
      throw new UnauthorizedException('KAKAO_USER_INFO_NOT_FOUND', [
        '카카오 사용자 정보 조회에 실패했습니다.',
      ]);
    }

    const data = (await response.json()) as KakaoUserResponse;
    const email = data.kakao_account?.email;
    if (!email) {
      throw new UnauthorizedException('KAKAO_USER_INFO_INCOMPLETE', [
        '카카오 계정에서 이메일 정보를 가져올 수 없습니다.',
      ]);
    }

    const nickname = data.kakao_account?.profile?.nickname;
    if (!nickname) {
      throw new UnauthorizedException('KAKAO_USER_INFO_INCOMPLETE', [
        '카카오 계정에서 닉네임 정보를 가져올 수 없습니다.',
      ]);
    }

    return UserInfo.from({
      id: data.id,
      email: Email.from(email),
      name: nickname,
      provider: 'KAKAO',
    });
  }
}
