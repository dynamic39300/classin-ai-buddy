import type { CoursePackageRun, PackageExecutionReceipt } from '@domain/workbuddy/course-package';

export interface PackageWritebackAdapter {
  execute(run: CoursePackageRun): Readonly<{ run: CoursePackageRun; receipt: PackageExecutionReceipt }>;
}
