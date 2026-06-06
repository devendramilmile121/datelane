#!/usr/bin/env bash
# verify-angular.sh — prove the packed @datelane/core tarball links + AOT-compiles against a
# specific Angular major. Scaffolds a throwaway standalone app pinned to that version, installs
# the tarball, and runs a production `ng build`. A green build means the consuming Angular
# linker accepts the library's partial-Ivy declarations on that version.
#
# Usage:  scripts/verify-angular.sh <angular-major> <path-to-tarball>
# Example: scripts/verify-angular.sh 18 dist/datelane/datelane-core-0.1.0.tgz
set -euo pipefail

NG_MAJOR="${1:?Angular major required, e.g. 18}"
TARBALL="${2:?Path to @datelane/core tarball required}"
TARBALL_ABS="$(cd "$(dirname "$TARBALL")" && pwd)/$(basename "$TARBALL")"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
echo "▶ Verifying @datelane/core against Angular ${NG_MAJOR} in ${WORK}"

cd "$WORK"

# Pin the CLI to the requested major so `ng new` scaffolds that version's workspace.
npm i -D "@angular/cli@${NG_MAJOR}" --no-save >/dev/null 2>&1 || npm i -D "@angular/cli@${NG_MAJOR}"
npx --yes "@angular/cli@${NG_MAJOR}" new consumer \
  --standalone --routing=false --style=css --ssr=false \
  --skip-git --skip-tests --package-manager=npm >/dev/null

cd consumer

# Install the library under test + the matching adapters' optional peers.
npm i "$TARBALL_ABS" luxon >/dev/null

# Minimal component that imports the scheduler + a view factory + the providers,
# forcing the AOT compiler to link the library's partial declarations.
cat > src/app/app.component.ts <<'TS'
import { Component } from '@angular/core';
import { SchedulerComponent, weekView, type ViewDescriptor } from '@datelane/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SchedulerComponent],
  template: `<dl-scheduler [views]="views" height="400px"></dl-scheduler>`,
})
export class AppComponent {
  views: ViewDescriptor[] = [weekView({ isDefault: true })];
}
TS

cat > src/main.ts <<'TS'
import { bootstrapApplication } from '@angular/platform-browser';
import { provideScheduler } from '@datelane/core';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, { providers: [provideScheduler()] });
TS

echo "▶ Production build (AOT) on Angular ${NG_MAJOR}…"
npx ng build --configuration production

echo "✅ Angular ${NG_MAJOR}: @datelane/core links and AOT-compiles."
