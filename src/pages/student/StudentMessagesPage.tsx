import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePageHeader } from '@app/shell/usePageHeader';
import { getMessageThreadTitle } from '@domain/message/message';
import { MessageWorkspace, useMessageThreads } from '@features/message-workspace';

export function StudentMessagesPage() {
  const [searchParams] = useSearchParams();
  const threads = useMessageThreads();
  const target = threads.find(({ id }) => id === searchParams.get('thread'));
  const title = target ? getMessageThreadTitle('student-family', target) : '消息';
  const fromHome = searchParams.get('source') === 'home';
  const pageHeader = useMemo(() => fromHome && target
    ? { title, breadcrumbs: [{ label: '首页', to: '/student/home' }, { label: title }] }
    : { title: '消息' }, [fromHome, target, title]);
  usePageHeader(pageHeader);
  return <MessageWorkspace role="student-family" />;
}
