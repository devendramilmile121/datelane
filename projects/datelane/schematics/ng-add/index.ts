// schematics/ng-add/index.ts — `ng add @datelane/core`.
// Registers the scheduler stylesheet in the target project's build `styles` and prints the
// minimal wiring a consumer still has to do (provider + view factories). Keeps the surface small:
// it never edits app code, so it can't clobber a hand-written bootstrap.

import { JsonArray } from '@angular-devkit/core';
import { Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { getWorkspace, updateWorkspace } from '@schematics/angular/utility/workspace';
import { Schema } from './schema';

/** Source SCSS shipped by the package (compiled by Angular's own build pipeline). */
const STYLE_ENTRY = 'node_modules/@datelane/core/styles/scheduler.scss';

export function ngAdd(options: Schema): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    const workspace = await getWorkspace(tree);

    const projectName =
      options.project ||
      (workspace.extensions['defaultProject'] as string | undefined) ||
      firstApplication(workspace);

    if (!projectName || !workspace.projects.has(projectName)) {
      throw new SchematicsException(
        `Could not find a project to add @datelane/core to. Pass --project=<name>.`,
      );
    }

    return updateWorkspace((ws) => {
      const project = ws.projects.get(projectName)!;
      const build = project.targets.get('build');
      if (!build) {
        context.logger.warn(
          `Project "${projectName}" has no build target; skipped stylesheet registration. ` +
            `Import "${STYLE_ENTRY}" manually.`,
        );
      } else {
        build.options ??= {};
        const styles = (build.options['styles'] as JsonArray | undefined) ?? [];
        const already = styles.some((s) => s === STYLE_ENTRY);
        if (already) {
          context.logger.info(`@datelane/core stylesheet already registered — nothing to do.`);
        } else {
          build.options['styles'] = [STYLE_ENTRY, ...styles];
          context.logger.info(`✓ Added ${STYLE_ENTRY} to "${projectName}" build styles.`);
        }
      }

      printNextSteps(context);
    });
  };
}

/** First application-type project in the workspace, used when no default is set. */
function firstApplication(
  workspace: Awaited<ReturnType<typeof getWorkspace>>,
): string | undefined {
  for (const [name, project] of workspace.projects) {
    if (project.extensions['projectType'] === 'application') return name;
  }
  return undefined;
}

function printNextSteps(context: SchematicContext): void {
  context.logger.info(
    [
      '',
      'Next steps to render a scheduler:',
      '',
      "  1. Provide a date adapter in your app config:",
      "       import { provideScheduler, provideNativeDateAdapter } from '@datelane/core';",
      '       providers: [provideScheduler(), provideNativeDateAdapter()]',
      '',
      "  2. Use the component + view factories in a template:",
      "       import { SchedulerComponent, weekView, monthView } from '@datelane/core';",
      "       <dl-scheduler [views]=\"[weekView(), monthView()]\" [events]=\"events\" [fieldMap]=\"fieldMap\" />",
      '',
      '  Docs: https://github.com/devendramilmile121/datelane#readme',
      '',
    ].join('\n'),
  );
}
