if (process.env.NODE_ENV !== 'production') { require('dotenv').config({ silent: true }); } // eslint-disable-line global-require
import manta from 'manta';

const bleedIn = 0;
const gutterMarginWidthMm = 4;
const gutterMarginOffsetMm = gutterMarginWidthMm / 2;
const gutterMarginOffsetIn = gutterMarginOffsetMm * 0.0393701;
const leftMarginIn = 0.5 + gutterMarginOffsetIn;
const rightMarginIn = 0.5 + gutterMarginOffsetIn;
const topMarginIn = 0.5;
// Add a second number to the bottom number to make room for the page numbers
// But I think now the line height is sufficient
const bottomMarginIn = 0.5 + 0.0;
const heightIn = 9;
const widthIn = 6;

const bleed = `${bleedIn}in`;
const gutterMarginOffset = `${gutterMarginOffsetMm}mm`;
const leftMargin = `${leftMarginIn}in`;
const rightMargin = `${rightMarginIn}in`;
const topMargin = `${topMarginIn}in`;
const bottomMargin = `${bottomMarginIn}in`;
const height = `${heightIn}in`;
const width = `${widthIn}in`;

const config = {
  mongoUrl: process.env.MONGO_URL,
  height,
  width,
  rightMargin,
  leftMargin,
  topMargin,
  bottomMargin,
  bleed,
  gutterMarginOffset,
  emailOptions: {
    height,
    width,
    border: {
      top: topMargin,
      right: rightMargin,
      bottom: bottomMargin,
      left: leftMargin,
    },
    timeout: 120000,
  },
  pageOptions: {
    height,
    width,
    border: {
      top: topMargin,
      right: rightMargin,
      bottom: bottomMargin,
      left: leftMargin,
    },
    timeout: 120000,
  },
  coverOptions: {
    timeout: 120000,
    border: '0',
  },
  mantaClient: manta.createClient({
    sign: manta.privateKeySigner({
      key: process.env.MANTA_APP_KEY.replace(/\\n/g, '\n'),
      keyId: process.env.MANTA_APP_KEY_ID,
      user: process.env.MANTA_APP_USER,
    }),
    user: process.env.MANTA_APP_USER,
    url: process.env.MANTA_APP_URL,
    connectTimeout: 25000,
  }),
};

export default config;
