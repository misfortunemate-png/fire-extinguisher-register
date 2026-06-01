// 何を: トースト通知表示コンポーネント
// なぜ: 画面下部にフローティング表示し、アクションボタンも配置できる

export default function Toast({ toasts, dismissToast }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast${t.error ? ' toast-error' : ''}`}>
          <span>{t.message}</span>
          {t.actions && (
            <div className="toast-actions">
              {t.actions.map(a => (
                <button
                  key={a.label}
                  className="btn btn-sm"
                  style={{ background: a.primary ? '#fff' : '#52525b', color: a.primary ? '#18181b' : '#fff' }}
                  onClick={() => { a.onClick(); dismissToast(t.id); }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
