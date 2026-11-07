// Dev server proxy: /api → intellect-api. Set API_URL when the API isn't on localhost:3000.
export default {
  '/api': {
    target: process.env.API_URL ?? 'http://localhost:3000',
    secure: false,
    pathRewrite: { '^/api': '' },
  },
};
