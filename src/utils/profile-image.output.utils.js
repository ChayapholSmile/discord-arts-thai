const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

const {
  getBadges,
  genBase,
  genFrame,
  genTextAndAvatar,
  genAvatarFrame,
  genBorder,
  genBotVerifBadge,
  genXpBar,
  addShadow, // Assuming this is now a utility function to set canvas shadow properties
} = require('../utils/profile-image.utils');

GlobalFonts.registerFromPath(
  `${path.join(__dirname, '..', '..', 'public', 'fonts')}/SF-Thonburi-Bold.ttf`,
  `SF Thonburi Bold`
);
GlobalFonts.registerFromPath(
  `${path.join(__dirname, '..', '..', 'public', 'fonts')}/SF-Thonburi.ttf`,
  `SF Thonburi`
);

async function genPng(data, options) {
  const { basicInfo, assets } = data;
  const canvas = createCanvas(885, 303);
  const ctx = canvas.getContext('2d');

  const userAvatar = (assets.avatarURL ?? assets.defaultAvatarURL) + '?size=512';
  const userBanner = assets.bannerURL ? assets.bannerURL + '?size=512' : null;

  // Use Promise.all to fetch and generate images that don't depend on each other
  const [cardBase, cardFrame, cardTextAndAvatar, badges] = await Promise.all([
    genBase(options, userAvatar, userBanner),
    genFrame(data, options),
    genTextAndAvatar(data, options, userAvatar, ctx),
    getBadges(data, options)
  ]);

  // --- 1. Clipping for rounded corners (fixed by using beginPath) ---
  ctx.beginPath();
  if (options?.removeBorder) {
    ctx.roundRect(9, 9, 867, 285, [26]);
  } else {
    ctx.roundRect(0, 0, 885, 303, [34]);
  }
  ctx.clip();

  // --- 2. Drawing the generated layers ---
  ctx.drawImage(cardBase, 0, 0);
  ctx.drawImage(cardFrame, 0, 0);

  // Assuming addShadow now sets the canvas context properties
  addShadow(ctx, '#000000', 8, 0, 0); // Example of setting shadow properties
  ctx.drawImage(cardTextAndAvatar, 0, 0);
  addShadow(ctx, 'none'); // Clear the shadow

  if (
    !options?.disableProfileTheme &&
    data?.decoration?.profileColors &&
    typeof options?.borderColor === 'undefined'
  ) {
    options.borderColor = data?.decoration?.profileColors;
    if (!options?.borderAllign) {
      options.borderAllign = 'vertical';
    }
  }

  if (
    (typeof options?.borderColor === 'string' && options.borderColor) ||
    (Array.isArray(options?.borderColor) && options.borderColor.length > 0)
  ) {
    const border = await genBorder(options);
    ctx.drawImage(border, 0, 0);
  }

  // Drawing other elements with shadows
  if (basicInfo?.bot) {
    const botVerifBadge = await genBotVerifBadge(data);
    addShadow(ctx, '#000000', 4, 0, 0);
    ctx.drawImage(botVerifBadge, 0, 0);
    addShadow(ctx, 'none');
  }

  if (!options?.removeBadges) {
    const cardBadges = await genBadges(badges);
    addShadow(ctx, '#000000', 4, 0, 0);
    ctx.drawImage(cardBadges, 0, 0);
    addShadow(ctx, 'none');
  }

  if (options?.rankData) {
    const xpBar = genXpBar(options);
    ctx.drawImage(xpBar, 0, 0);
  }

  if (
    !options?.removeAvatarFrame &&
    data?.decoration?.avatarFrame
  ) {
    const avatarFrame = await genAvatarFrame(data, options);
    ctx.drawImage(avatarFrame, 0, 0);
  }

  return canvas.toBuffer('image/png');
}

module.exports = { genPng };
