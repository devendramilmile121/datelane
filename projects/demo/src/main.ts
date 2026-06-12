import { bootstrapApplication } from '@angular/platform-browser';
import { provideScheduler } from '@datelane/core';
import { ShellComponent } from './app/shell.component';

bootstrapApplication(ShellComponent, { providers: [provideScheduler()] });
