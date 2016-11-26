if (process.env.NODE_ENV !== 'production') { require('dotenv').config({ silent: true }); } // eslint-disable-line global-require
import manta from 'manta';

const bleedIn = 0;
const bindMarginIn = 0.125;
const marginIn = 0.5;
const heightIn = 9;
const widthIn = 6 - bindMarginIn;

const bleed = `${bleedIn}in`;
const bindMargin = `${bindMarginIn}in`;
const margin = `${marginIn}in`;
const height = `${heightIn}in`;
const width = `${widthIn}in`;

const config = {
  mongoUrl: process.env.MONGO_URL,
  bleed,
  bindMargin,
  emailOptions: {
    height,
    width,
    border: {
      top: margin,
      right: margin,
      bottom: margin,
      left: margin,
    },
    timeout: 120000,
  },
  pageOptions: {
    height,
    width,
    border: {
      top: margin,
      right: margin,
      bottom: margin,
      left: margin,
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
