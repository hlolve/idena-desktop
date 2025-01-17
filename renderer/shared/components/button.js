/* eslint-disable react/prop-types */
import React from 'react'
import {
  Button as ChakraButton,
  IconButton as ChakraIconButton,
  Icon,
  Stack,
  Text,
  Box,
} from '@chakra-ui/react'
import {rem} from '../theme'
import {InfoIcon} from './icons'

const BaseButton = React.forwardRef((props, ref) => (
  <ChakraButton
    ref={ref}
    fontWeight={500}
    h={8}
    px={4}
    py="3/2"
    rounded="md"
    _disabled={{
      bg: 'gray.300',
      color: 'rgb(150 153 158)',
    }}
    {...props}
  />
))
BaseButton.displayName = 'BaseButton'

export const PrimaryButton = React.forwardRef((props, ref) => (
  <BaseButton ref={ref} colorScheme="brandBlue" color="white" {...props} />
))
PrimaryButton.displayName = 'PrimaryButton'

// eslint-disable-next-line react/display-name
export const SecondaryButton = React.forwardRef((props, ref) => (
  <Box
    ref={ref}
    as="button"
    bg="brandBlue.10"
    color="brandBlue.500"
    fontSize="md"
    fontWeight={500}
    h={8}
    px={4}
    py="3/2"
    rounded="md"
    transition="all 0.2s cubic-bezier(.08,.52,.52,1)"
    _hover={{bg: 'brandBlue.20'}}
    _active={{
      bg: 'brandBlue.50',
      transform: 'scale(0.98)',
    }}
    _focus={{
      shadow: 'outline',
      outline: 'none',
    }}
    _disabled={{
      bg: 'gray.50',
      color: 'rgb(150 153 158)',
    }}
    // eslint-disable-next-line react/destructuring-assignment
    disabled={props.isDisabled}
    {...props}
  />
))

// eslint-disable-next-line react/display-name
export const IconButton2 = React.forwardRef(({icon, ...props}, ref) => (
  <ChakraButton
    ref={ref}
    variant="ghost"
    colorScheme="blue"
    fontWeight={500}
    alignItems="center"
    justifyContent="flex-start"
    h="8"
    px="2"
    leftIcon={React.cloneElement(icon, {boxSize: '5'})}
    {...props}
  />
))

export const InfoButton = React.forwardRef((props, ref) => (
  <ChakraIconButton
    ref={ref}
    icon={<InfoIcon />}
    color="brandBlue.500"
    bg="unset"
    fontSize={rem(20)}
    minW={5}
    w={5}
    h={5}
    _active={{
      bg: 'unset',
    }}
    _hover={{
      bg: 'unset',
    }}
    _focus={{
      outline: 'none',
    }}
    {...props}
  />
))
InfoButton.displayName = 'InfoButton'
