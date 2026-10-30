// Live2D widget, injected through `inject.bottom` in _config.butterfly.yml.
// waifu-tips.js is an ES module, so this file must stay `type="module"`.
const BASE = 'https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.1/dist/';
const MODEL_API = 'https://fastly.jsdelivr.net/gh/fghrsh/live2d_api/';

if (window.innerWidth >= 768) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = BASE + 'waifu.css';
  document.head.appendChild(link);

  try {
    await import(BASE + 'waifu-tips.js');
    window.initWidget({
      waifuPath: BASE + 'waifu-tips.json',
      cdnPath: MODEL_API,
      cubism2Path: BASE + 'live2d.min.js',
      cubism5Path: 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
      tools: ['hitokoto', 'switch-model', 'switch-texture', 'photo', 'info', 'quit'],
      logLevel: 'warn',
      drag: false
    });
  } catch (err) {
    console.warn('[live2d] widget failed to load', err);
  }
}
