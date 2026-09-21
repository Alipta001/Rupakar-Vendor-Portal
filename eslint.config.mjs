import nextConfig from 'eslint-config-next'

export default [
  ...nextConfig,
  {
    ignores: ['.next/**', 'node_modules/**'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]
