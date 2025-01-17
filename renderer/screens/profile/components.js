/* eslint-disable react/prop-types */
import React, {useEffect, useState} from 'react'
import {
  Stack,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  useTheme,
  FormControl,
  Text,
  Box,
  Flex,
  Button,
  Radio,
  Icon,
  Switch,
  Alert,
  AlertDescription,
  List,
  ListItem,
  useDisclosure,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  Tag,
  FormHelperText,
  RadioGroup,
  HStack,
} from '@chakra-ui/react'
import {useTranslation} from 'react-i18next'
import {useMachine} from '@xstate/react'
import {useQuery} from 'react-query'
import {
  Avatar,
  Tooltip,
  FormLabel,
  Input,
  Drawer,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Checkbox,
  DialogFooter,
  DialogBody,
  Dialog,
  FailAlert,
  TextLink,
} from '../../shared/components/components'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {
  mapToFriendlyStatus,
  useIdentity,
  useIdentityState,
} from '../../shared/providers/identity-context'
import {IdentityStatus, NodeType} from '../../shared/types'
import {useInvite} from '../../shared/providers/invite-context'
import {activateMiningMachine} from './machines'
import {
  callRpc,
  dummyAddress,
  eitherState,
  humanizeDuration,
  toLocaleDna,
  toPercent,
} from '../../shared/utils/utils'
import {useEpochState} from '../../shared/providers/epoch-context'
import {useFailToast, useSuccessToast} from '../../shared/hooks/use-toast'
import {getStakingWarning, validateInvitationCode} from './utils'
import {BLOCK_TIME} from '../oracles/utils'
import {useInviteScore, useReplenishStake, useStakingAlert} from './hooks'
import {DnaInput, FillCenter} from '../oracles/components'
import {useTotalValidationScore} from '../validation-report/hooks'
import {
  ChevronRightIcon,
  InfoIcon,
  UserIcon,
} from '../../shared/components/icons'

export function UserInlineCard({
  identity: {address, state},
  children,
  ...props
}) {
  return (
    <Stack isInline spacing={6} align="center" {...props}>
      <Avatar
        address={address}
        bg="white"
        borderWidth={1}
        borderColor="gray.016"
      />
      <Stack spacing={0} w="full">
        <Stack spacing={1}>
          <Heading as="h2" fontSize="lg" fontWeight={500} lineHeight="short">
            {mapToFriendlyStatus(state)}
          </Heading>
          <Heading
            as="h3"
            fontSize="mdx"
            fontWeight="normal"
            color="muted"
            lineHeight="shorter"
          >
            {address}
          </Heading>
        </Stack>
        {children}
      </Stack>
    </Stack>
  )
}

export function UserStatList({title, children, ...props}) {
  return (
    <Stack spacing={4} {...props}>
      <Heading as="h4" fontSize="lg" fontWeight={500}>
        {title}
      </Heading>
      <Stack spacing={4} bg="gray.50" px={10} py={8} rounded="lg">
        {children}
      </Stack>
    </Stack>
  )
}

export function SimpleUserStat({label, value, ...props}) {
  return (
    <UserStat {...props}>
      <UserStatLabel>{label}</UserStatLabel>
      <UserStatValue>{value}</UserStatValue>
    </UserStat>
  )
}

export function AnnotatedUserStat({
  annotation,
  label,
  value,
  children,
  ...props
}) {
  const {colors} = useTheme()
  return (
    <UserStat {...props}>
      <UserStatLabel
        borderBottom={`dotted 1px ${colors.muted}`}
        cursor="help"
        fontWeight={500}
      >
        <UserStatLabelTooltip label={annotation}>{label}</UserStatLabelTooltip>
      </UserStatLabel>
      {value && <UserStatValue>{value}</UserStatValue>}
      {children}
    </UserStat>
  )
}

export function UserStat(props) {
  return <Stat as={Stack} spacing="3px" {...props} />
}

export function UserStatLabel(props) {
  return (
    <StatLabel
      color="muted"
      alignSelf="flex-start"
      fontSize="md"
      lineHeight="short"
      {...props}
    />
  )
}

export function UserStatValue(props) {
  return (
    <StatNumber fontSize="md" fontWeight={500} lineHeight="base" {...props} />
  )
}

export function UserStatLabelTooltip(props) {
  return <Tooltip placement="top" zIndex="tooltip" {...props} />
}

// eslint-disable-next-line react/display-name
export const ActivateInviteForm = React.forwardRef(
  ({onHowToGetInvitation, ...props}, ref) => {
    const {t} = useTranslation()

    const failToast = useFailToast()

    const [{activationTx}, {activateInvite}] = useInvite()

    const {state: status} = useIdentityState()

    const [code, setCode] = React.useState()

    const mining = !!activationTx

    const hasBeenInvited = status === IdentityStatus.Invite

    return (
      <Box
        ref={ref}
        as="form"
        onSubmit={async e => {
          e.preventDefault()
          try {
            const trimmedCode = code?.trim()

            if (trimmedCode) {
              if (!validateInvitationCode(trimmedCode))
                throw new Error('invalid')
            }

            await activateInvite(trimmedCode)
          } catch ({message}) {
            failToast(
              // eslint-disable-next-line no-nested-ternary
              ['missing', 'invalid'].some(errorCode =>
                message.includes(errorCode)
              )
                ? t('Invitation code is not valid')
                : message.includes('validation ceremony')
                ? t(
                    'Can not activate invitation since the validation is running'
                  )
                : message
            )
          }
        }}
        {...props}
      >
        {hasBeenInvited ? (
          <Flex justify="flex-end">
            <PrimaryButton
              isLoading={mining}
              loadingText={t('Mining...')}
              type="submit"
            >
              {t('Accept invitation')}
            </PrimaryButton>
          </Flex>
        ) : (
          <Stack spacing={6}>
            <FormControl>
              <Stack spacing={3}>
                <Flex justify="space-between" align="center">
                  <FormLabel htmlFor="code" p={0}>
                    {t('Invitation code')}
                  </FormLabel>
                  <Button
                    variant="ghost"
                    isDisabled={mining}
                    bg="unset"
                    color="muted"
                    fontWeight={500}
                    h="unset"
                    p={0}
                    _hover={{bg: 'unset'}}
                    _active={{bg: 'unset'}}
                    _focus={{boxShadow: 'none'}}
                    onClick={() => setCode(global.clipboard.readText())}
                  >
                    {t('Paste')}
                  </Button>
                </Flex>
                <Input
                  id="code"
                  value={code}
                  isDisabled={mining}
                  resize="none"
                  _disabled={{
                    bg: 'gray.50',
                  }}
                  _placeholder={{
                    color: 'muted',
                  }}
                  onChange={e => setCode(e.target.value)}
                />
              </Stack>
            </FormControl>
            <Stack spacing={4} isInline align="center" justify="flex-end">
              <Button
                variant="link"
                colorScheme="blue"
                fontWeight={500}
                _hover={null}
                _active={null}
                onClick={onHowToGetInvitation}
              >
                {t('How to get an invitation')}
              </Button>
              <PrimaryButton
                isLoading={mining}
                loadingText={t('Mining...')}
                type="submit"
              >
                {t('Activate invitation')}
              </PrimaryButton>
            </Stack>
          </Stack>
        )}
      </Box>
    )
  }
)

export function SpoilInviteDrawer({children, ...props}) {
  const {t} = useTranslation()
  return (
    <Drawer {...props}>
      <DrawerHeader mb={6}>
        <Avatar address={dummyAddress} mx="auto" />
        <Heading
          fontSize="lg"
          fontWeight={500}
          color="brandGray.500"
          mt={4}
          mb={0}
          textAlign="center"
        >
          {t('Spoil invitation code')}
        </Heading>
      </DrawerHeader>
      <DrawerBody>
        <Text fontSize="md" mb={6}>
          {t(
            `Spoil invitations that are shared publicly. This will encourage people to share invitations privately and prevent bots from collecting invitation codes.`
          )}
        </Text>
        {children}
      </DrawerBody>
    </Drawer>
  )
}

export function SpoilInviteForm({onSpoil}) {
  const {t} = useTranslation()
  return (
    <Stack
      as="form"
      spacing={6}
      onSubmit={e => {
        e.preventDefault()
        onSpoil(e.target.elements.key.value)
      }}
    >
      <FormControl>
        <FormLabel htmlFor="key">Invitation code</FormLabel>
        <Input id="key" placeholder={t('Invitation code to spoil')} />
      </FormControl>
      <Text fontSize="md">
        {t(
          `When you click 'Spoil' the invitation code will be activated by a random address and wasted.`
        )}
      </Text>
      <PrimaryButton ml="auto" type="submit">
        {t('Spoil invite')}
      </PrimaryButton>
    </Stack>
  )
}

export function ActivateMiningForm({
  isOnline,
  delegatee,
  delegationEpoch,
  pendingUndelegation,
  onShow,
}) {
  const failToast = useFailToast()

  const epoch = useEpochState()

  const [current, send] = useMachine(activateMiningMachine, {
    context: {
      isOnline,
      delegatee,
      delegationEpoch,
    },
    actions: {
      onError: (_, {data}) => failToast(data?.message),
    },
  })
  const {mode} = current.context

  React.useEffect(() => {
    send('CANCEL')
  }, [isOnline, delegatee, send])

  const isDelegator = typeof delegatee === 'string'

  return (
    <>
      <ActivateMiningSwitch
        isOnline={isOnline || isDelegator}
        isDelegator={isDelegator}
        onShow={() => {
          send('SHOW')
          if (onShow) onShow()
        }}
      />
      {isOnline || isDelegator ? (
        <DeactivateMiningDrawer
          delegatee={delegatee}
          canUndelegate={epoch?.epoch > delegationEpoch}
          isOpen={eitherState(current, 'showing')}
          isCloseable={false}
          isLoading={eitherState(current, 'showing.mining')}
          onDeactivate={() => {
            send('DEACTIVATE', {
              mode: isDelegator ? NodeType.Delegator : NodeType.Miner,
            })
          }}
          onClose={() => {
            send('CANCEL')
          }}
        />
      ) : (
        <ActivateMiningDrawer
          mode={mode}
          delegationEpoch={delegationEpoch}
          pendingUndelegation={pendingUndelegation}
          currentEpoch={epoch?.epoch}
          isOpen={eitherState(current, 'showing')}
          isCloseable={false}
          isLoading={eitherState(current, 'showing.mining')}
          onChangeMode={value => {
            send({type: 'CHANGE_MODE', mode: value})
          }}
          // eslint-disable-next-line no-shadow
          onActivate={({delegatee}) => {
            send('ACTIVATE', {delegatee})
          }}
          onClose={() => {
            send('CANCEL')
          }}
        />
      )}
    </>
  )
}

export function ActivateMiningSwitch({isOnline, isDelegator, onShow}) {
  const {t} = useTranslation()

  return (
    <Stack spacing="3">
      <Text fontWeight={500} h={18}>
        {t('Status')}
      </Text>
      <Flex
        align="center"
        justify="space-between"
        borderColor="gray.300"
        borderWidth={1}
        rounded="md"
        h="8"
        px={3}
      >
        <FormLabel htmlFor="mining" fontWeight="normal" mb={0}>
          {isDelegator ? t('Delegation') : t('Mining')}
        </FormLabel>
        <Stack direction="row" align="center">
          <Text color={isOnline ? 'blue.500' : 'red.500'} fontWeight={500}>
            {isOnline ? t('On') : t('Off')}
          </Text>
          <Switch
            id="mining"
            size="sm"
            isChecked={isOnline}
            h="4"
            sx={{
              '& > input:not(:checked) + span': {
                background: 'red.500',
              },
            }}
            onChange={onShow}
          />
        </Stack>
      </Flex>
    </Stack>
  )
}

export function ActivateMiningDrawer({
  mode,
  delegationEpoch,
  pendingUndelegation,
  currentEpoch,
  isLoading,
  onChangeMode,
  onActivate,
  onClose,
  ...props
}) {
  const {t} = useTranslation()

  const delegateeInputRef = React.useRef()

  const willDelegate = mode === NodeType.Delegator

  const waitForDelegationEpochs =
    3 - (currentEpoch - delegationEpoch) <= 0
      ? 3
      : 3 - (currentEpoch - delegationEpoch)

  return (
    <Drawer onClose={onClose} {...props}>
      <DrawerHeader>
        <Flex
          align="center"
          justify="center"
          bg="blue.012"
          h={12}
          w={12}
          rounded="xl"
        >
          <UserIcon boxSize="6" color="blue.500" />
        </Flex>
        <Heading
          color="brandGray.500"
          fontSize="lg"
          fontWeight={500}
          lineHeight="base"
          mt={4}
        >
          {t('Miner status')}
        </Heading>
      </DrawerHeader>
      <DrawerBody>
        <Stack spacing={6} mt={30}>
          <FormControl as={Stack} spacing={3}>
            <FormLabel p={0}>{t('Type')}</FormLabel>
            <RadioGroup value={mode} onChange={onChangeMode}>
              <HStack spacing="2">
                <Radio value={NodeType.Miner} variant="bordered" flex={1}>
                  {t('Mining')}
                </Radio>
                <Radio value={NodeType.Delegator} variant="bordered" flex={1}>
                  {t('Delegation')}
                </Radio>
              </HStack>
            </RadioGroup>
          </FormControl>
          {willDelegate ? (
            <Stack spacing={5}>
              <FormControl as={Stack} spacing={3}>
                <FormLabel>{t('Delegation address')}</FormLabel>
                <Input
                  ref={delegateeInputRef}
                  defaultValue={pendingUndelegation}
                  isDisabled={Boolean(pendingUndelegation)}
                />
              </FormControl>

              {pendingUndelegation ? (
                <FailAlert>
                  {t(
                    'You have recently disabled delegation. You need to wait for {{count}} epochs to delegate to a new address.',
                    {count: waitForDelegationEpochs}
                  )}
                </FailAlert>
              ) : (
                <FailAlert>
                  <Text>
                    {t(
                      'You can lose your stake, all your mining and validation rewards if you delegate your mining status.'
                    )}
                  </Text>
                  <Text>
                    {t(
                      'Disabling delegation could be done at the next epoch only.'
                    )}
                  </Text>
                </FailAlert>
              )}
            </Stack>
          ) : (
            <Box bg="gray.50" p={6} py={4}>
              <Heading
                color="brandGray.500"
                fontSize="base"
                fontWeight={500}
                mb={2}
              >
                {t('Activate mining status')}
              </Heading>
              <Text fontSize="md" color="muted" mb={3}>
                {t(
                  `Submit the form to start mining. Your node has to be online unless you deactivate your status. Otherwise penalties might be charged after being offline more than 1 hour.`
                )}
              </Text>
              <Text fontSize="md" color="muted">
                {t('You can deactivate your online status at any time.')}
              </Text>
            </Box>
          )}
        </Stack>
      </DrawerBody>
      <DrawerFooter>
        <Stack isInline>
          <SecondaryButton onClick={onClose}>{t('Cancel')}</SecondaryButton>
          <PrimaryButton
            isLoading={isLoading}
            onClick={() => {
              onActivate({delegatee: delegateeInputRef.current?.value})
            }}
            loadingText={t('Waiting...')}
          >
            {t('Submit')}
          </PrimaryButton>
        </Stack>
      </DrawerFooter>
    </Drawer>
  )
}

export function DeactivateMiningDrawer({
  isLoading,
  delegatee,
  canUndelegate,
  onDeactivate,
  onClose,
  ...props
}) {
  const {t} = useTranslation()

  const isDelegator = typeof delegatee === 'string'

  return (
    <Drawer onClose={onClose} {...props}>
      <DrawerHeader>
        <Flex
          align="center"
          justify="center"
          bg="blue.012"
          h={12}
          w={12}
          rounded="xl"
        >
          <UserIcon boxSize="6" color="blue.500" />
        </Flex>
        <Heading
          color="brandGray.500"
          fontSize="lg"
          fontWeight={500}
          lineHeight="base"
          mt={4}
        >
          {isDelegator
            ? t('Deactivate delegation status')
            : t('Deactivate mining status')}
        </Heading>
      </DrawerHeader>
      <DrawerBody>
        <Stack spacing={6} mt={30}>
          <Text fontSize="md">
            {isDelegator
              ? t(`Submit the form to deactivate your delegation status.`)
              : t(
                  `Submit the form to deactivate your mining status. You can activate it again afterwards.`
                )}
          </Text>
          {isDelegator && (
            <FormControl as={Stack} spacing={3}>
              <FormLabel>{t('Delegation address')}</FormLabel>
              <Input defaultValue={delegatee} isDisabled />
            </FormControl>
          )}
          {isDelegator && !canUndelegate && (
            <Alert
              status="error"
              rounded="md"
              bg="red.010"
              borderColor="red.050"
              borderWidth={1}
            >
              <InfoIcon alignSelf="flex-start" color="red.500" />
              <AlertDescription
                color="brandGray.500"
                fontSize="md"
                fontWeight={500}
              >
                {t('You can disable delegation at the next epoch only')}
              </AlertDescription>
            </Alert>
          )}
        </Stack>
      </DrawerBody>
      <DrawerFooter>
        <Stack isInline>
          <SecondaryButton onClick={onClose}>{t('Cancel')}</SecondaryButton>
          <PrimaryButton
            isDisabled={isDelegator && !canUndelegate}
            isLoading={isLoading}
            onClick={onDeactivate}
            loadingText={t('Waiting...')}
          >
            {t('Submit')}
          </PrimaryButton>
        </Stack>
      </DrawerFooter>
    </Drawer>
  )
}

export function KillIdentityDrawer({address, children, ...props}) {
  const {t} = useTranslation()

  return (
    <Drawer {...props}>
      <DrawerHeader mb={6}>
        <Avatar address={address} mx="auto" />
        <Heading
          fontSize="lg"
          fontWeight={500}
          color="brandGray.500"
          mt={4}
          mb={0}
          textAlign="center"
        >
          {t('Terminate identity')}
        </Heading>
      </DrawerHeader>
      <DrawerBody>
        <Text fontSize="md" mb={6}>
          {t(`Terminate your identity and withdraw the stake. Your identity status
            will be reset to 'Not validated'.`)}
        </Text>
        {children}
      </DrawerBody>
    </Drawer>
  )
}

export function KillForm({onSuccess, onFail}) {
  const {t} = useTranslation(['translation', 'error'])

  const [{address, stake}, {killMe}] = useIdentity()

  const toastSuccess = useSuccessToast()
  const toastFail = useFailToast()

  const [submitting, setSubmitting] = React.useState(false)

  return (
    <Stack
      as="form"
      spacing={6}
      onSubmit={async e => {
        e.preventDefault()

        try {
          const to = e.target.elements.to.value

          if (to !== address)
            throw new Error(t('You must specify your own identity address'))

          setSubmitting(true)

          const {result, error} = await killMe({to})

          setSubmitting(false)

          if (error) {
            toastFail({
              title: t('Error while sending transaction'),
              description: error.message,
            })
          } else {
            toastSuccess(t('Transaction sent'))
            if (onSuccess) onSuccess(result)
          }
        } catch (error) {
          setSubmitting(false)
          toastFail(error?.message ?? t('Something went wrong'))
          if (onFail) onFail(error)
        }
      }}
    >
      <FormControl>
        <FormLabel htmlFor="stake">{t('Withdraw stake, iDNA')}</FormLabel>
        <Input
          id="stake"
          value={stake}
          isDisabled
          _disabled={{
            bg: 'gray.50',
          }}
        />
      </FormControl>

      <Text fontSize="md" mb={6}>
        {t(
          'Please enter your identity address to confirm termination. Stake will be transferred to the identity address.'
        )}
      </Text>
      <FormControl>
        <FormLabel htmlFor="to">{t('Address')}</FormLabel>
        <Input id="to" placeholder={t('Your identity address')} />
      </FormControl>

      <PrimaryButton
        ml="auto"
        type="submit"
        isLoading={submitting}
        colorScheme="red"
        _hover={{
          bg: 'rgb(227 60 60)',
        }}
        _active={{
          bg: 'rgb(227 60 60)',
        }}
        _focus={{
          boxShadow: '0 0 0 3px rgb(255 102 102 /0.50)',
        }}
      >
        {t('Terminate')}
      </PrimaryButton>
    </Stack>
  )
}

export function MyIdenaBotAlert({onConnect, onSkip}) {
  const {t} = useTranslation()

  const {state} = useIdentityState()

  const myIdenaBotDisclosure = useDisclosure()

  const [doNotShowAgain, setDoNotShowAgain] = React.useState()

  const connectButtonRef = React.useRef()

  // eslint-disable-next-line no-shadow
  const eitherState = (...states) => states.some(s => s === state)

  return (
    <>
      <Alert
        variant="solid"
        justifyContent="center"
        flexShrink={0}
        boxShadow="0 3px 12px 0 rgb(255 163 102 /0.1), 0 2px 3px 0 rgb(255 163 102 /0.2)"
        color="white"
        cursor="pointer"
        fontWeight={500}
        rounded="md"
        h={10}
        mt={2}
        mx={2}
        w="auto"
        onClick={myIdenaBotDisclosure.onOpen}
      >
        <Flex flexGrow={1}>
          <Flex flexGrow={1} alignItems="center" justifyContent="center">
            <Box ml={6}>
              <Icon name="telegram" boxSize={6} mr={1} />
              {t(`Subscribe to @MyIdenaBot to get personalized notifications based on
        your status`)}
            </Box>
          </Flex>
          <Flex ml="auto">
            <Button
              variant="link"
              colorScheme="white"
              width={12}
              pl={2}
              height={10}
              fontWeight={500}
              _hover={null}
              _active={null}
              onClick={e => {
                e.stopPropagation()
                onSkip()
              }}
            >
              {t('Close')}
            </Button>
          </Flex>
        </Flex>
      </Alert>

      <Dialog
        title="Subscribe to @MyIdenaBot"
        size="md"
        initialFocusRef={connectButtonRef}
        {...myIdenaBotDisclosure}
      >
        <DialogBody>
          <Stack>
            <Text>
              {t(
                `MyIdenaBot reminds you about important actions based on your
              identity status:`,
                {nsSeparator: '!!'}
              )}
            </Text>

            {eitherState(IdentityStatus.Undefined) && (
              <IdenaBotFeatureList
                features={[
                  'next validation reminder',
                  'notification when you get an invite',
                  'reminder to activate your invite',
                  'your validation results when validation consensus is reached',
                ]}
              />
            )}

            {eitherState(IdentityStatus.Invite, IdentityStatus.Candidate) && (
              <IdenaBotFeatureList
                features={[
                  'next validation reminder',
                  'your validation results when validation consensus is reached',
                ]}
              />
            )}

            {eitherState(IdentityStatus.Newbie) && (
              <IdenaBotFeatureList
                features={[
                  'next validation reminder',
                  'reminder to create flips if you haven’t done it yet and the validation is coming',
                  'your validation results when validation consensus is reached',
                ]}
              />
            )}

            {eitherState(IdentityStatus.Verified, IdentityStatus.Human) && (
              <IdenaBotFeatureList
                features={[
                  'next validation reminder',
                  'reminder to create flips',
                  'your validation results when validation consensus is reached',
                  'reminder to share your remaining invites',
                  'reminder to submit extra flips to get more rewards',
                  'status update of all your invitees to check if they are ready for the validation (activated invites, submitted flips)',
                ]}
              />
            )}
            {eitherState(IdentityStatus.Zombie, IdentityStatus.Suspended) && (
              <IdenaBotFeatureList
                features={[
                  'next validation reminder',
                  'your validation results when validation consensus is reached',
                  'reminder to share your remaining invites',
                  'reminder to submit extra flips to get more rewards',
                  'status update of all your invitees to check if they are ready for the validation (activated invites, submitted flips)',
                ]}
              />
            )}
          </Stack>
        </DialogBody>
        <DialogFooter align="center">
          <Checkbox
            borderColor="gray.100"
            isChecked={doNotShowAgain}
            onChange={e => {
              setDoNotShowAgain(e.target.checked)
            }}
          >
            {t('Do not show again')}
          </Checkbox>
          <SecondaryButton
            onClick={() => {
              myIdenaBotDisclosure.onClose()
              if (doNotShowAgain) onConnect()
            }}
          >
            {t('Not now')}
          </SecondaryButton>
          <PrimaryButton
            ref={connectButtonRef}
            onClick={() => {
              global.openExternal('https://t.me/MyIdenaBot')
              onConnect()
            }}
          >
            {t('Connect')}
          </PrimaryButton>
        </DialogFooter>
      </Dialog>
    </>
  )
}

function IdenaBotFeatureList({features, listSeparator = ';'}) {
  return (
    <List spacing={1} styleType="'- '">
      {features.map((feature, idx) => (
        <ListItem key={feature} textTransform="lowercase">
          {feature}
          {idx < features.length - 1 ? listSeparator : '.'}
        </ListItem>
      ))}
    </List>
  )
}

export function ProfileTagList() {
  const {t, i18n} = useTranslation()

  const [
    {age, penalty, penaltySeconds, totalShortFlipPoints, totalQualifiedFlips},
  ] = useIdentity()

  const epoch = useEpochState()

  const score = useTotalValidationScore()

  const inviteScore = useInviteScore()

  const formatDna = toLocaleDna(i18n.language, {maximumFractionDigits: 5})

  return (
    <Stack direction="row" spacing="1" w="full" flexWrap="wrap">
      {age > 0 && <ProfileTag label={t('Age')} value={age} />}

      {Number.isFinite(score) && (
        <Box>
          <Popover placement="top" arrowShadowColor="transparent">
            <PopoverTrigger>
              <Box>
                <ProfileTag
                  label={t('Score')}
                  value={toPercent(score)}
                  cursor="help"
                />
              </Box>
            </PopoverTrigger>
            <ProfileTagPopoverContent>
              <Stack>
                <Stack spacing="2px">
                  <Text color="muted" lineHeight="shorter">
                    {t('Total score')}
                  </Text>
                  <Text color="white" lineHeight="base">
                    {t(
                      `{{totalShortFlipPoints}} out of {{totalQualifiedFlips}}`,
                      {
                        totalShortFlipPoints,
                        totalQualifiedFlips,
                      }
                    )}
                  </Text>
                </Stack>
                <Stack spacing="2px">
                  <Text color="muted" lineHeight="shorter">
                    {t('Epoch #{{epoch}}', {epoch: epoch?.epoch})}
                  </Text>
                  <TextLink
                    href="/validation-report"
                    color="white"
                    lineHeight="base"
                  >
                    {t('Validation report')}
                    <ChevronRightIcon />
                  </TextLink>
                </Stack>
              </Stack>
            </ProfileTagPopoverContent>
          </Popover>
        </Box>
      )}

      {/* TODO: remove after fork 0.30.0 */}
      {penalty > 0 && (
        <ProfileTag
          label={t('Mining penalty')}
          value={formatDna(penalty)}
          bg="red.012"
          color="red.500"
        />
      )}

      {penaltySeconds > 0 && (
        <ProfileTag
          label={t('Mining penalty')}
          value={humanizeDuration(penaltySeconds)}
          bg="red.012"
          color="red.500"
        />
      )}

      {inviteScore > 0 && (
        <Box>
          <ProfileTagPopover>
            <ProfileTagPopoverTrigger>
              <ProfileTag
                label={t('Invitation rewards')}
                value={toPercent(inviteScore)}
                cursor="help"
                bg={
                  // eslint-disable-next-line no-nested-ternary
                  inviteScore < 0.75
                    ? 'red.010'
                    : inviteScore < 0.99
                    ? 'orange.010'
                    : 'green.010'
                }
                color={
                  // eslint-disable-next-line no-nested-ternary
                  inviteScore < 0.75
                    ? 'red.500'
                    : inviteScore < 0.99
                    ? 'orange.500'
                    : 'green.500'
                }
              />
            </ProfileTagPopoverTrigger>
            <ProfileTagPopoverContent>
              <Stack spacing="2px" w={40}>
                <Text color="xwhite.040" lineHeight="base">
                  {t(
                    'You will get {{invitationRewardRatio}} of the invitation rewards if your invite is activated now',
                    {invitationRewardRatio: toPercent(inviteScore)}
                  )}
                </Text>
                <TextLink href="/contacts" color="white" lineHeight="base">
                  {t('Check invites')}
                  <ChevronRightIcon />
                </TextLink>
              </Stack>
            </ProfileTagPopoverContent>
          </ProfileTagPopover>
        </Box>
      )}
    </Stack>
  )
}

export const ProfileTag = React.forwardRef(function ProfileTag(
  {label, value, ...props},
  ref
) {
  return (
    <Tag
      ref={ref}
      bg="gray.016"
      borderRadius="xl"
      fontSize="sm"
      px="3"
      minH="6"
      mt="1.5"
      {...props}
    >
      <Stack isInline spacing="1">
        <Text>{label}</Text>
        <Text>{value}</Text>
      </Stack>
    </Tag>
  )
})

export function ProfileTagPopover(props) {
  return <Popover placement="top" arrowShadowColor="transparent" {...props} />
}

function ProfileTagPopoverTrigger({children}) {
  return (
    <PopoverTrigger>
      <Box>{children}</Box>
    </PopoverTrigger>
  )
}

function ProfileTagPopoverContent({children}) {
  return (
    <PopoverContent
      border="none"
      fontSize="sm"
      w="fit-content"
      zIndex="popover"
      _focus={{
        outline: 'none',
      }}
    >
      <PopoverArrow bg="graphite.500" />
      <PopoverBody bg="graphite.500" borderRadius="sm" p="2" pt="1">
        {children}
      </PopoverBody>
    </PopoverContent>
  )
}

export function ReplenishStakeDrawer({onSuccess, onError, isOpen, ...props}) {
  const {t, i18n} = useTranslation()

  const {address, state, age} = useIdentityState()

  const {data: balanceData} = useQuery({
    queryKey: ['get-balance', address],
    // eslint-disable-next-line no-shadow
    queryFn: ({queryKey: [, address]}) => callRpc('dna_getBalance', address),
    enabled: Boolean(address),
    staleTime: (BLOCK_TIME / 2) * 1000,
    notifyOnChangeProps: 'tracked',
  })

  const [sendValue, setSendValue] = useState('')

  const {submit} = useReplenishStake({onSuccess, onError})

  const formatDna = toLocaleDna(i18n.language, {
    maximumFractionDigits: 5,
  })

  const [checkboxes, setCheckboxes] = useState({
    cb1: {show: false, value: false},
    cb2: {show: false, value: false},
    cb3: {show: false, value: false},
    cb4: {show: false, value: false},
  })

  useEffect(() => {
    setCheckboxes({
      cb1: {show: true, value: false},
      cb2: {
        show: [IdentityStatus.Candidate, IdentityStatus.Newbie].includes(state),
        value: false,
      },
      cb3: {
        show: state === IdentityStatus.Candidate,
        value: false,
      },
      cb4: {show: !!getStakingWarning(t, state, age), value: false},
    })
  }, [age, state, isOpen, t])

  const allChecked = Object.entries(checkboxes).reduce(
    (prev, current) => prev && (current[1].show ? current[1].value : true),
    true
  )

  return (
    <Drawer isOpen={isOpen} {...props}>
      <DrawerHeader>
        <Stack spacing="4">
          <FillCenter bg="blue.012" h={12} minH={12} w={12} rounded="xl">
            <Icon name="wallet" boxSize="6" color="blue.500" />
          </FillCenter>
          <Heading
            color="brandGray.500"
            fontSize="lg"
            fontWeight={500}
            lineHeight="base"
          >
            {t('Add stake')}
          </Heading>
        </Stack>
      </DrawerHeader>
      <DrawerBody fontSize="md">
        <Stack spacing={30}>
          <Stack>
            <Text>
              {t(
                'Get quadratic staking rewards for locking iDNA in your identity stake.'
              )}
            </Text>
            <Text>
              {t('Current stake amount: {{amount}}', {
                amount: formatDna(balanceData?.stake),
                nsSeparator: '!!',
              })}
            </Text>
          </Stack>
          <Stack spacing="2.5" px={1}>
            <form
              id="replenishStake"
              onSubmit={e => {
                e.preventDefault()

                submit({amount: sendValue})
              }}
            >
              <FormControl>
                <FormLabel mx={0} mb="3">
                  {t('Amount')}
                </FormLabel>
                <DnaInput
                  name="amount"
                  onChange={e => setSendValue(Number(e.target.value))}
                />
                <FormHelperText fontSize="md">
                  <Flex justify="space-between">
                    <Box as="span" color="muted">
                      {t('Available')}
                    </Box>
                    <Box as="span" color="brandGray.500">
                      {formatDna(balanceData?.balance)}
                    </Box>
                  </Flex>
                </FormHelperText>
              </FormControl>
              <Stack mt={4} spacing={2}>
                <FormControl>
                  <Checkbox
                    className="custom-checkbox"
                    alignItems="flex-start"
                    isChecked={checkboxes.cb1.value}
                    onChange={e => {
                      setCheckboxes({
                        ...checkboxes,
                        cb1: {
                          ...checkboxes.cb1,
                          value: e.target.checked,
                        },
                      })
                    }}
                  >
                    {t(
                      'I understand that I can only withdraw my stake by terminating my identity'
                    )}
                  </Checkbox>
                </FormControl>
                {checkboxes.cb2.show && (
                  <FormControl>
                    <Checkbox
                      className="custom-checkbox"
                      alignItems="flex-start"
                      isChecked={checkboxes.cb2.value}
                      onChange={e =>
                        setCheckboxes({
                          ...checkboxes,
                          cb2: {
                            ...checkboxes.cb2,
                            value: e.target.checked,
                          },
                        })
                      }
                    >
                      {t(
                        'I understand that I can not terminate my identity until I get Verified or Human status'
                      )}
                    </Checkbox>
                  </FormControl>
                )}
                {checkboxes.cb3.show && (
                  <FormControl>
                    <Checkbox
                      className="custom-checkbox"
                      alignItems="flex-start"
                      isChecked={checkboxes.cb3.value}
                      onChange={e =>
                        setCheckboxes({
                          ...checkboxes,
                          cb3: {
                            ...checkboxes.cb3,
                            value: e.target.checked,
                          },
                        })
                      }
                    >
                      {t(
                        'I understand that inviter can terminate my identity and burn my stake until I get validated'
                      )}
                    </Checkbox>
                  </FormControl>
                )}
                {checkboxes.cb4.show && (
                  <FormControl>
                    <Checkbox
                      className="custom-checkbox"
                      alignItems="flex-start"
                      isChecked={checkboxes.cb4.value}
                      onChange={e =>
                        setCheckboxes({
                          ...checkboxes,
                          cb4: {
                            ...checkboxes.cb4,
                            value: e.target.checked,
                          },
                        })
                      }
                    >
                      {getStakingWarning(t, state, age)}
                    </Checkbox>
                  </FormControl>
                )}
              </Stack>
              <style jsx global>{`
                .custom-checkbox > input + div {
                  margin-top: 2px;
                }
              `}</style>
            </form>
          </Stack>
        </Stack>
      </DrawerBody>
      <DrawerFooter>
        <Stack isInline>
          {/* eslint-disable-next-line react/destructuring-assignment */}
          <SecondaryButton onClick={props.onClose}>
            {t('Not now')}
          </SecondaryButton>
          <PrimaryButton
            form="replenishStake"
            type="submit"
            isDisabled={!allChecked || !sendValue}
          >
            {t('Add stake')}
          </PrimaryButton>
        </Stack>
      </DrawerFooter>
    </Drawer>
  )
}

export function StakingAlert(props) {
  const warning = useStakingAlert()

  return warning ? (
    <FailAlert {...props}>
      {Array.isArray(warning) ? (
        <Stack spacing={0}>
          {warning.map((message, idx) => (
            <Text key={idx} as="span">
              {message}
            </Text>
          ))}
        </Stack>
      ) : (
        warning
      )}
    </FailAlert>
  ) : null
}
