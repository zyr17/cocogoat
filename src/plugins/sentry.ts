import { App } from 'vue'
import * as Sentry from '@sentry/electron'
import { Integrations } from '@sentry/tracing'
import { IConfig, EBuild } from '@/typings/config'
import { Vue as VueIntegration } from '@sentry/integrations'

export function initSentry(config: IConfig, app: App) {
}
