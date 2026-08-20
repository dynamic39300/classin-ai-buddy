import type { ClassInWritebackAdapter, WritebackScenario, WritebackScenarioController } from '@contracts/workbuddy/classin-writeback';
import type { PackageWritebackAdapter, PackageWritebackScenario, PackageWritebackScenarioController } from '@contracts/workbuddy/package-writeback';
import type { CoursePackageRun, PackageExecutionReceipt } from '@domain/workbuddy/course-package';
import type { PackageApproval, PackageProposedAction } from '@domain/workbuddy/package-writeback';
import type { Approval, ExecutionReceipt, ProposedAction } from '@domain/workbuddy/writeback';
import { MockClassInWritebackAdapter } from './workbuddy-classin-writeback';
import { MockPackageWritebackAdapter } from './workbuddy-package-writeback';

/** Independent contract fixture used to prove consumers depend on the Adapter Interface. */
export class DeterministicTestWritebackAdapter implements ClassInWritebackAdapter, WritebackScenarioController {
  private readonly delegate = new MockClassInWritebackAdapter();

  execute(action: ProposedAction, approval: Approval): ExecutionReceipt {
    return this.delegate.execute(action, approval);
  }

  setScenario(scenario: WritebackScenario) {
    this.delegate.setScenario(scenario);
  }

  getScenario() {
    return this.delegate.getScenario();
  }

  reset() {
    this.delegate.reset();
  }
}

export class DeterministicTestPackageWritebackAdapter implements PackageWritebackAdapter, PackageWritebackScenarioController {
  private readonly delegate = new MockPackageWritebackAdapter();

  execute(action: PackageProposedAction, approval: PackageApproval, run: CoursePackageRun): PackageExecutionReceipt {
    return this.delegate.execute(action, approval, run);
  }

  setScenario(scenario: PackageWritebackScenario) {
    this.delegate.setScenario(scenario);
  }

  getScenario() {
    return this.delegate.getScenario();
  }

  reset() {
    this.delegate.reset();
  }
}
