import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, QrCode, Search, Share2, UserPlus, X } from 'lucide-react';
import styles from './ClassCollaborationWorkspace.module.css';

type InviteMethod = 'contacts' | 'passcode' | 'qr';

type ContactCandidate = {
  id: string;
  name: string;
  account: string;
};

const CONTACTS: readonly ContactCandidate[] = [
  { id: 'contact-zhou', name: '周然', account: 'zhou.ran' },
  { id: 'contact-chen', name: '陈宁', account: 'chen.ning' },
  { id: 'contact-lin', name: '林一', account: 'lin.yi' },
  { id: 'contact-zhao', name: '赵一凡', account: 'zhao.yifan' },
];

const QR_SIZE = 11;

function getInvitePasscode(classId: string): string {
  const seed = Array.from(classId).reduce((value, character) => value + character.charCodeAt(0), 0);
  const first = String(100 + (seed % 900));
  const second = String(100 + ((seed * 7) % 900));
  return `${first} ${second}`;
}

function getQrCells(classId: string): boolean[] {
  let seed = Array.from(classId).reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 2166136261);
  return Array.from({ length: QR_SIZE * QR_SIZE }, (_, index) => {
    const row = Math.floor(index / QR_SIZE);
    const column = index % QR_SIZE;
    const finder = (
      (row < 4 && column < 4)
      || (row < 4 && column >= QR_SIZE - 4)
      || (row >= QR_SIZE - 4 && column < 4)
    );
    seed = ((seed * 1664525) + 1013904223) >>> 0;
    return finder ? row % 3 !== 1 || column % 3 !== 1 : (seed & 1) === 1;
  });
}

export function InviteMembersDialog({
  classId,
  className,
  onClose,
}: {
  classId: string;
  className: string;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<InviteMethod>('contacts');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [feedback, setFeedback] = useState('');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const passcode = useMemo(() => getInvitePasscode(classId), [classId]);
  const qrCells = useMemo(() => getQrCells(classId), [classId]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const contacts = CONTACTS.filter(({ name, account }) => (
    !normalizedQuery || `${name} ${account}`.toLocaleLowerCase().includes(normalizedQuery)
  ));

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const toggleContact = (contactId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
    setFeedback('');
  };

  const submitContacts = () => {
    if (selectedIds.size === 0) return;
    setFeedback(`已完成 ${selectedIds.size} 位联系人的邀请演示，班级成员与人数未改变。`);
  };

  const setPlaceholderFeedback = (action: '复制' | '保存' | '分享') => {
    setFeedback(`${action}入口已保留，本 Demo 不执行真实邀请或外部分享。`);
  };

  return (
    <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={styles.inviteDialog} role="dialog" aria-modal="true" aria-labelledby="invite-dialog-title">
        <header className={styles.dialogHeader}>
          <div>
            <span><UserPlus aria-hidden="true" size={16} />班级协作</span>
            <h2 id="invite-dialog-title">邀请成员</h2>
            <small>{className}</small>
          </div>
          <button ref={closeButtonRef} className={styles.iconButton} type="button" onClick={onClose} aria-label="关闭邀请成员">
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className={styles.dialogTabs} role="tablist" aria-label="邀请方式">
          <button type="button" role="tab" aria-selected={method === 'contacts'} onClick={() => { setMethod('contacts'); setFeedback(''); }}>联系人</button>
          <button type="button" role="tab" aria-selected={method === 'passcode'} onClick={() => { setMethod('passcode'); setFeedback(''); }}>In口令</button>
          <button type="button" role="tab" aria-selected={method === 'qr'} onClick={() => { setMethod('qr'); setFeedback(''); }}>二维码</button>
        </div>

        {method === 'contacts' ? (
          <div className={styles.dialogBody} role="tabpanel">
            <label className={styles.searchField}>
              <Search aria-hidden="true" size={16} />
              <span className={styles.srOnly}>搜索联系人</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索联系人账号名" />
            </label>
            <div className={styles.contactList} aria-label="联系人列表">
              {contacts.map((contact) => (
                <label className={styles.contactRow} key={contact.id}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(contact.id)}
                    onChange={() => toggleContact(contact.id)}
                  />
                  <span><strong>{contact.name}</strong><small>{contact.account}</small></span>
                  {selectedIds.has(contact.id) ? <Check aria-hidden="true" size={16} /> : null}
                </label>
              ))}
              {contacts.length === 0 ? <p className={styles.emptyInline}>没有匹配的联系人</p> : null}
            </div>
            <footer className={styles.dialogFooter}>
              <button className={styles.secondaryButton} type="button" onClick={onClose}>取消</button>
              <button className={styles.primaryButton} type="button" disabled={selectedIds.size === 0} onClick={submitContacts}>确定 {selectedIds.size}</button>
            </footer>
          </div>
        ) : null}

        {method === 'passcode' ? (
          <div className={styles.credentialPanel} role="tabpanel">
            <span>In口令</span>
            <strong className={styles.passcode}>{passcode}</strong>
            <button className={styles.secondaryButton} type="button" onClick={() => setPlaceholderFeedback('复制')}>
              <Copy aria-hidden="true" size={16} />复制口令
            </button>
          </div>
        ) : null}

        {method === 'qr' ? (
          <div className={styles.credentialPanel} role="tabpanel">
            <span><QrCode aria-hidden="true" size={16} />邀请二维码</span>
            <div className={styles.qrMock} aria-label={`${className}邀请二维码 Mock`}>
              {qrCells.map((filled, index) => <i key={index} data-filled={filled} />)}
            </div>
            <div className={styles.inlineActions}>
              <button className={styles.secondaryButton} type="button" onClick={() => setPlaceholderFeedback('保存')}><Download aria-hidden="true" size={16} />保存</button>
              <button className={styles.secondaryButton} type="button" onClick={() => setPlaceholderFeedback('分享')}><Share2 aria-hidden="true" size={16} />分享</button>
            </div>
          </div>
        ) : null}

        {feedback ? <p className={styles.dialogFeedback} role="status">{feedback}</p> : null}
      </section>
    </div>
  );
}
