import type { PackageWritebackAdapter } from '@contracts/workbuddy/package-writeback';
import { executePackageWriteback, type CoursePackageRun } from '@domain/workbuddy/course-package';

export class MockPackageWritebackAdapter implements PackageWritebackAdapter {
  execute(run: CoursePackageRun) {
    return executePackageWriteback(run);
  }
}
