import React from 'react'
import {
  Stack,
  TabList,
  Tabs,
  TabPanels,
  TabPanel,
  Alert,
  AlertIcon,
} from '@chakra-ui/core'
import {useRouter} from 'next/router'
import {useMachine} from '@xstate/react'
import nanoid from 'nanoid'
import {Page, PageTitle} from '../../screens/app/components'
import Layout from '../../shared/components/layout'
import {PrimaryButton} from '../../shared/components'
import {saveAd} from '../../screens/ads/utils'
import {
  AdFooter,
  AdNumberInput,
  AdFormField,
  AdFormTab,
  AdForm,
} from '../../screens/ads/components'
import {editAdMachine} from '../../screens/ads/machines'

export default function NewAd() {
  const router = useRouter()

  const [current, send] = useMachine(editAdMachine, {
    actions: {
      onSuccess: () => router.push('/ads/list'),
    },
    services: {
      submit: async ctx => {
        saveAd({id: nanoid(), ...ctx})
        return Promise.resolve()
      },
    },
  })

  return (
    <Layout style={{flex: 1, display: 'flex'}}>
      <Page mb={12}>
        <PageTitle>New ad</PageTitle>
        <Tabs variant="unstyled">
          <TabList>
            <AdFormTab>Parameters</AdFormTab>
            <AdFormTab isDisabled>Publish options</AdFormTab>
          </TabList>
          <Alert
            my={6}
            variant="subtle"
            status="success"
            border="1px"
            borderColor="green.200"
            fontWeight={500}
            rounded="md"
          >
            <AlertIcon size="20px" name="info" />
            You must publish this banner after creating.
          </Alert>
          <TabPanels>
            <TabPanel>
              <AdForm onChange={ad => send('UPDATE', {ad})} />
            </TabPanel>
            <TabPanel>
              <Stack spacing={6} w="480px">
                <Stack spacing={4} shouldWrapChildren>
                  <AdFormField label="Max burn rate" id="maxBurnRate">
                    <AdNumberInput />
                  </AdFormField>
                  <AdFormField label="Max burn rate" id="minBurnRate">
                    <AdNumberInput />
                  </AdFormField>
                  <AdFormField label="Total banner budget" id="totalBudget">
                    <AdNumberInput />
                  </AdFormField>
                  <AdFormField label="Total burnt" id="totalBurnt">
                    <AdNumberInput isDisabled />
                  </AdFormField>
                </Stack>
              </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>
        <AdFooter>
          <PrimaryButton
            onClick={() => send('SUBMIT')}
            isLoading={current.matches('submitting')}
          >
            Save
          </PrimaryButton>
        </AdFooter>
      </Page>
    </Layout>
  )
}
