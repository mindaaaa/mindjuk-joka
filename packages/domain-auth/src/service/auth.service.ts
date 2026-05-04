import { UnauthorizedException } from '@joka/core/src/exception';
import { Email } from '@joka/core/src/model/Email';
import { DraftUser, User } from '@joka/core/src/model/User';

import { AdmissionTicket } from '../domain/AdmissionTicket';
import { JwtProvider } from '../domain/helper/jwt.provider';
import { TokenPair } from '../domain/TokenPair';
import { KakaoAuthClient } from '../infrastructure/client/kakao-auth.client';
import { UserRepository } from '../infrastructure/persistence/user.repository';

export interface AuthConfig {
  kakaoClientId: string;
  kakaoClientSecret: string;
  kakaoRedirectUri: string;
  jwtSecret: string;
}

// REMIND: 초기 버전에서는 카카오 로그인만 지원
export class AuthService {
  private kakaoClient: KakaoAuthClient;
  private userRepository: UserRepository;
  private jwtProvider: JwtProvider;

  constructor() {
    this.kakaoClient = new KakaoAuthClient();
    this.userRepository = new UserRepository();
    this.jwtProvider = new JwtProvider();
  }

  async findUserOrNull(cid: string): Promise<User | null> {
    return this.userRepository.findByCid(cid);
  }

  async login(code: string, config: AuthConfig): Promise<AdmissionTicket> {
    const kakaoToken = await this.kakaoClient.exchangeCode(code, {
      clientId: config.kakaoClientId,
      clientSecret: config.kakaoClientSecret,
      redirectUri: config.kakaoRedirectUri,
    });

    const user = await this.getUserOrSignIn(kakaoToken);
    const accessToken = await this.jwtProvider.generateAccessToken(
      user,
      config.jwtSecret,
    );
    const refreshToken = await this.jwtProvider.generateRefreshToken(
      user,
      config.jwtSecret,
    );

    return AdmissionTicket.from({
      tokenPair: TokenPair.from({ accessToken, refreshToken }),
      user,
    });
  }

  private async getUserOrSignIn(kakaoToken: string): Promise<User> {
    const kakaoUser = await this.kakaoClient.getUserInfo(kakaoToken);
    const user = await this.userRepository.findByEmailAndProvider(
      kakaoUser.email,
      'KAKAO',
    );
    if (user) {
      await this.userRepository.updateLastAccessedAt(user);
      return user;
    }

    return this.userRepository.insert(
      DraftUser.from({
        name: kakaoUser.name,
        email: kakaoUser.email.value,
        provider: 'KAKAO',
      }),
    );
  }

  async refresh(
    refreshToken: string,
    config: AuthConfig,
  ): Promise<AdmissionTicket> {
    const payload = await this.jwtProvider.verifyToken(
      refreshToken,
      config.jwtSecret,
    );

    const user = await this.userRepository.findByEmailAndProvider(
      Email.from(payload.email),
      'KAKAO',
    );
    if (!user) {
      throw new UnauthorizedException('INVALID_TOKEN', [
        '유효하지 않은 인증 토큰입니다.',
      ]);
    }

    const newAccessToken = await this.jwtProvider.generateAccessToken(
      user,
      config.jwtSecret,
    );
    const newRefreshToken = await this.jwtProvider.generateRefreshToken(
      user,
      config.jwtSecret,
    );

    return AdmissionTicket.from({
      tokenPair: TokenPair.from({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      }),
      user,
    });
  }
}
