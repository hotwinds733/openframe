export const PROVIDER_BASE_URLS = {
  volcengine: 'https://ark.cn-beijing.volces.com/api/v3',
  volcengineImage: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
  qwen: 'https://dashscope.aliyuncs.com/api/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  ollama: 'http://localhost:11434',
} as const

export const PROVIDER_DEFAULT_MEDIA_OPTIONS = {
  volcengine: {
    imageSize: '2K',
  },
} as const
