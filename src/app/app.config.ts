import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

// Angular 21 działa domyślnie bez zone.js ("zoneless") – zmiany wykrywane są przez sygnały.
export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners()],
};
