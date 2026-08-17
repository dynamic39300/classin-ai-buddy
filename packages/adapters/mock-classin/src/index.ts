import type { CourseDraftGateway, CourseDraftInput, CourseDraftReceipt } from "@workbuddy/application";
import { simulatedCourseVersion } from "@workbuddy/fixtures";

export class MockClassInCourseDraftGateway implements CourseDraftGateway {
  async saveDraft(input: CourseDraftInput): Promise<CourseDraftReceipt> {
    if (input.scope.tenantId !== "org-xinghe-001") {
      return { status: "permission-denied", truthLabel: "simulated" };
    }

    if (input.expectedVersion !== simulatedCourseVersion) {
      return { status: "conflict", currentVersion: simulatedCourseVersion, truthLabel: "simulated" };
    }

    return {
      status: "saved",
      objectId: input.scope.courseId,
      version: simulatedCourseVersion + 1,
      truthLabel: "simulated",
    };
  }
}

