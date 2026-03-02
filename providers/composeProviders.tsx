import React, { type ReactNode, type ComponentType } from 'react';

type ProviderComponent = ComponentType<{ children: ReactNode }>;

export function composeProviders(
  providers: ProviderComponent[],
  children: ReactNode,
): React.ReactElement {
  return providers.reduceRight<React.ReactElement>(
    (acc, Provider) => <Provider>{acc}</Provider>,
    <>{children}</>,
  );
}
