import {
  BookOpen,
  BookOpenText,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FolderTree,
  LibraryBig,
  ListChecks,
  Megaphone,
  MessageSquareText,
  PackageOpen,
  PencilLine,
  PlayCircle,
  Presentation,
  Radio,
  RadioTower,
  Speech,
  SquarePen,
  UsersRound,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';
import type { TeachingObjectKind } from '@domain/teaching-object/teaching-object';

const TEACHING_OBJECT_ICONS: Record<TeachingObjectKind, LucideIcon> = {
  class: UsersRound,
  course: BookOpen,
  unit: FolderTree,
  lesson: Presentation,
  'open-course': Radio,
  homework: ClipboardCheck,
  quiz: ListChecks,
  recording: PlayCircle,
  reading: BookOpenText,
  exercise: PencilLine,
  livestream: RadioTower,
  announcement: Megaphone,
  discussion: MessageSquareText,
  'answer-sheet': SquarePen,
  'check-in': CheckCircle2,
  material: LibraryBig,
  scorm: PackageOpen,
  schedule: CalendarClock,
  'ai-oral': Speech,
};

type TeachingObjectIconProps = Omit<LucideProps, 'children' | 'strokeWidth'> & {
  kind: TeachingObjectKind;
};

export function TeachingObjectIcon({
  kind,
  size = 16,
  'aria-hidden': ariaHidden = true,
  ...props
}: TeachingObjectIconProps) {
  const Icon = TEACHING_OBJECT_ICONS[kind];
  return (
    <Icon
      {...props}
      aria-hidden={ariaHidden}
      absoluteStrokeWidth
      data-teaching-object={kind}
      size={size}
      strokeWidth={1.75}
    />
  );
}
