import {theme as defaultTheme} from '@chakra-ui/react'

const breakpoints = {
  sm: '30em',
  md: '40em',
  lg: '52em',
  xl: '64em',
}

export const theme = {
  colors: {
    black: '#16161D',
    blue: {
      '010': 'rgb(87 143 255 / 0.1)',
      '012': 'rgb(87 143 255 / 0.12)',
      '020': 'rgb(87 143 255 / 0.2)',
      '025': 'rgb(87 143 255 / 0.25)',
      '030': 'rgb(87 143 255 / 0.3)',
      '032': 'rgb(87 143 255 / 0.32)',
      '090': 'rgb(87 143 255 / 0.9)',
      200: '#578fff',
      300: 'rgba(87, 143, 255, .12)',
      500: 'rgb(87, 143, 255)',
      600: 'rgb(87, 143, 255)',
    },
    gray: {
      '016': 'rgb(83 86 92 /0.16)',
      10: 'rgba(255,255,255,0.1)',
      50: 'rgb(245, 246, 247)',
      100: 'rgb(210, 212, 217)',
      200: '#53565c',
      300: 'rgb(232, 234, 237)',
      400: 'rgb(232, 234, 237)',
      500: 'rgb(232, 234, 237)',
      980: 'rgba(17 17 17 /0.80)',
    },
    red: {
      '010': 'rgb(255 102 102 /0.10)',
      '012': 'rgb(255 102 102 /0.12)',
      '020': 'rgb(255 102 102 /0.20)',
      '025': 'rgb(255 102 102 /0.25)',
      '050': 'rgb(255 102 102 /0.50)',
      '090': 'rgb(255 102 102 /0.90)',
      500: 'rgb(255, 102, 102)',
    },
    green: {
      '010': 'rgb(39 217 128 /.1)',
      '020': 'rgb(39 217 128 /.2)',
      '040': 'rgb(39 217 128 /.4)',
      '050': 'rgb(39 217 128 /.5)',
      500: 'rgb(39 217 128)',
    },
    orange: {
      '010': 'rgb(255 163 102 /0.1)',
      '020': 'rgb(255 163 102 /0.2)',
      '040': 'rgb(255 163 102 /0.5)',
      '050': 'rgb(255 163 102 /0.5)',
      500: 'rgb(255, 163, 102)',
    },
    warning: {
      '016': 'rgba(255, 163, 102, 0.16)',
      100: 'rgba(255, 163, 102, 0.2)',
      400: 'rgb(255, 163, 102)',
      500: 'rgb(255, 163, 102)',
    },
    success: {
      '016': 'rgba(39, 217, 128, 0.16)',
      100: 'rgba(39, 217, 128, 0.2)',
      400: 'rgb(39, 217, 128)',
    },
    muted: 'rgb(150, 153, 158)',
    brand: {
      gray: 'rgb(83, 86, 92)',
      blue: 'rgb(87, 143, 255)',
    },
    brandGray: {
      '005': 'rgb(83 86 92 /0.05)',
      '006': 'rgb(83 86 92 /0.06)',
      '016': 'rgb(83, 86, 92, 0.16)',
      '060': 'rgb(83 86 92 /0.6)',
      '080': 'rgb(83 86 92 /0.8)',
      500: 'rgb(83, 86, 92)',
    },
    brandBlue: {
      10: 'rgba(87, 143, 255, 0.12)',
      20: 'rgba(87, 143, 255, 0.24)',
      '025': 'rgba(87, 143, 255, 0.25)',
      50: 'rgba(87, 143, 255, 0.24)',
      100: '#578fff',
      200: '#578fff',
      300: '#447ceb',
      400: '#447ceb',
      500: 'rgb(87, 143, 255)',
      600: '#447ceb',
      700: '#447ceb',
    },
    xblack: {
      '016': 'rgb(0 0 0 /0.16)',
      '080': 'rgb(0 0 0 /0.8)',
    },
    xwhite: {
      '010': 'rgb(255 255 255 /0.10)',
      '016': 'rgb(255 255 255 /0.16)',
      '040': 'rgb(255 255 255 /0.4)',
      '050': 'rgba(255, 255, 255, 0.5)',
      '090': 'rgba(255, 255, 255, 0.9)',
    },
    graphite: {
      500: 'rgb(69 72 77)',
    },
  },
  fonts: {
    body: ['Inter', defaultTheme.fonts.body].join(', '),
    heading: ['Inter', defaultTheme.fonts.heading].join(', '),
  },
  fontSizes: {
    sm: '11px',
    md: '13px',
    mdx: '14px',
    base: '16px',
    lg: '18px',
    xl: '28px',
  },
  breakpoints,
  space: {
    '1/2': '2px',
    '3/2': '6px',
  },
  sizes: {
    sm: rem(360),
    md: rem(480),
  },
  radii: {
    sm: '0.25rem',
    md: rem(6),
    xl: '0.75rem',
  },
  components: {
    Modal: {
      baseStyle: {
        overlay: {
          bg: 'xblack.080',
        },
      },
      sizes: {
        mdx: {
          dialog: {
            maxW: '400px',
          },
        },
        md: {
          dialog: {
            maxW: '480px',
          },
        },
        '416': {
          dialog: {
            maxW: '416px',
          },
        },
        '664': {
          dialog: {
            maxW: '664px',
          },
        },
        xl: {
          dialog: {
            maxW: '30%',
          },
        },
      },
    },
    Radio: {
      sizes: {
        lg: {
          h: '14',
        },
      },
      variants: {
        bordered: {
          container: {
            borderColor: 'gray.300',
            borderWidth: 1,
            borderRadius: 'md',
            px: '3',
            py: '2',
          },
        },
      },
    },
    Button: {
      baseStyle: {
        fontWeight: 500,
      },
      variants: {
        tab: {
          color: 'muted',
          borderRadius: '6',
          h: '8',
          px: '4',
          _hover: {
            bg: 'gray.50',
            color: 'blue.500',
          },
          _selected: {
            bg: 'gray.50',
            color: 'blue.500',
          },
          _active: {
            bg: 'gray.50',
            color: 'blue.500',
          },
        },
      },
    },
  },
}

export function rem(value) {
  return `${value / 16}rem`
}
