export type BrandAsset = {
  url: string;
};

const brandAsset = (filename: string): BrandAsset => ({
  url: `/brand-assets/${filename}`,
});

export const kallistisCrystal = brandAsset("kallistis-canon-crystal.png?v=20260830-canon-crystal");
/** Compatibilidade nominal para superfícies antigas; a marca KALLISTIS usa o cristal. */
export const kallistisApple = kallistisCrystal;
export const kallistisAvatar = brandAsset("kallistis-avatar.png?v=20260830-canon-avatar");
export const kallistisWordmark = brandAsset(
  "kallistis-canon-wordmark.png?v=20260830-canon-wordmark",
);

export const klioApple = brandAsset("klio-apple.png");
export const klioAvatar = brandAsset("klio.png");

export const khoraApple = brandAsset("khora-apple.png");
export const khoraAvatar = brandAsset("khora-avatar.png");

export const kharisApple = brandAsset("kharis-apple.png");
export const kharisAvatar = brandAsset("kharis-avatar.png");

export const kuanyinApple = brandAsset("kuanyin-apple.png");
export const kuanyinAvatar = brandAsset("kuanyin-avatar.png");

export const kaApple = brandAsset("ka-apple.png");
export const kaAvatar = brandAsset("ka.png");

export const driveAppleAsset = brandAsset("kallistis-drive-apple.png");
export const driveAvatarAsset = brandAsset("kallistis-drive-avatar.png");

export const kairosApple = brandAsset("kairos-apple.png");
export const kairosAvatar = brandAsset("kairos.png");
