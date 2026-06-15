import { Component, signal } from '@angular/core';
import { PlaygroundComponent } from './playground.component';
import { DeveloperGuideComponent } from './developer-guide.component';

type Tab = 'playground' | 'guide';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [PlaygroundComponent, DeveloperGuideComponent],
  styles: [`
    :host {
      display: block; max-width: 1180px; margin: 0 auto; padding: 24px 20px 64px;
      font: 14px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1f2730;
    }
    header { margin-bottom: 20px; }
    h1 { font: 600 20px system-ui; margin: 0 0 2px; }
    .sub { font: 13px system-ui; color: #5b6470; margin: 0; }
    .tabs {
      display: inline-flex; gap: 2px; margin-top: 16px;
      background: #f1f3f5; padding: 3px; border-radius: 10px;
    }
    .tabs button {
      font: 500 13px system-ui; padding: 7px 16px; border: 0; border-radius: 8px;
      background: transparent; color: #5b6470; cursor: pointer;
    }
    .tabs button.active { background: #fff; color: #1f2730; box-shadow: 0 1px 2px rgba(0,0,0,.08); }
  `],
  template: `
    <header>
      <h1>&#64;datelane/core</h1>
      <p class="sub">Lightweight, customizable Angular scheduler — all 12 views, zero hard deps.</p>
      <nav class="tabs" role="tablist" aria-label="Sections">
        <button role="tab" [class.active]="tab() === 'guide'"
          [attr.aria-selected]="tab() === 'guide'" (click)="tab.set('guide')">
          Developer Guide
        </button>
        <button role="tab" [class.active]="tab() === 'playground'"
          [attr.aria-selected]="tab() === 'playground'" (click)="tab.set('playground')">
          Playground
        </button>
      </nav>
    </header>

    @if (tab() === 'guide') {
      <app-developer-guide />
    } @else {
      <app-playground />
    }
  `,
})
export class ShellComponent {
  readonly tab = signal<Tab>('guide');
}
