// core/providers.ts — provideScheduler(...) + native adapter provider.

import { Provider, EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { DateAdapter, SCHEDULER_DATE_ADAPTER, SCHEDULER_LOCALE } from '../date-adapter/date-adapter';
import { NativeDateAdapter } from '../date-adapter/native-date-adapter';

/** Default, zero-dependency date layer. */
export function provideNativeDateAdapter(opts: { locale?: string } = {}): Provider[] {
  return [
    { provide: SCHEDULER_LOCALE, useValue: opts.locale ?? 'en-US' },
    { provide: SCHEDULER_DATE_ADAPTER, useClass: NativeDateAdapter },
    { provide: DateAdapter, useExisting: SCHEDULER_DATE_ADAPTER },
  ];
}

/**
 * Root provider. Pass a date-adapter provider (native by default) and any feature providers.
 *   provideScheduler(provideLuxonDateAdapter({ locale: 'fr' }))
 */
export function provideScheduler(...providers: Provider[]): EnvironmentProviders {
  const hasAdapter = providers.some(
    (p: any) => p?.provide === SCHEDULER_DATE_ADAPTER || (Array.isArray(p) && p.some((x: any) => x?.provide === SCHEDULER_DATE_ADAPTER)),
  );
  return makeEnvironmentProviders([
    ...(hasAdapter ? [] : provideNativeDateAdapter()),
    ...providers,
  ]);
}
