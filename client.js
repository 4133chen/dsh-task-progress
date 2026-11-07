/**
 * @local/task-progress — browser half.
 *
 * Upgrades the session task list into a progress view:
 *  - one approximate progress bar per task (pending 0%, in progress 50%,
 *    completed 100%) driven by the session `todos` projection;
 *  - an always-visible overall progress bar in the panel header;
 *  - an opt-in completion reminder with an in-app toast and, when the browser
 *    grants the permission, a system notification.
 *
 * The panel replaces the shipped todo dock in `conversation.input.dock`
 * (same cell id, lower priority) so the list is not rendered twice; the toast
 * stack is added to `shell.overlay`, the additive frame-wide layer.
 */
window.__ModuleLoader__.load({
  id: '@local/task-progress',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'task-progress';
    const PLUGIN_ID = '@local/task-progress';
    const STYLE_KEY = PLUGIN_ID + '/task-progress.css';
    const PREF_KEY = 'dsh.task-progress.v1';
    const REMEMBER_WINDOW_MS = 5000;
    const TOAST_LIFETIME_MS = 6500;
    const WEIGHT = { completed: 1, in_progress: 0.5, pending: 0 };

    /** Localized copy owned by this plugin. Keys are identical in every locale. */
    const zh = {
      'title': '任务进度',
      'summary': '已完成 {done}/{total} · {percent}%',
      'bar.overall': '整体进度 {percent}%',
      'bar.task': '{content}，进度 {percent}%',
      'status.pending': '待处理',
      'status.in_progress': '进行中',
      'status.completed': '已完成',
      'remind.enable': '开启任务完成提醒',
      'remind.disable': '关闭任务完成提醒',
      'toast.remindOn': '提醒已开启',
      'toast.remindOnBody': '任务完成时会提醒你',
      'toast.deniedTitle': '系统通知未授权',
      'toast.deniedBody': '完成提醒将继续以页面内提示显示',
      'toast.taskDone': '任务完成',
      'toast.taskDoneBody': '{content}（已完成 {done}/{total}）',
      'toast.tasksDoneBody': '又有 {count} 项任务完成（已完成 {done}/{total}）',
      'toast.allDone': '全部任务完成',
      'toast.allDoneBody': '共 {total} 项任务已全部完成 🎉',
      'toast.session': '会话：{title}',
      'toast.dismiss': '关闭提醒'
    };
    const en = {
      'title': 'Task progress',
      'summary': 'Done {done}/{total} · {percent}%',
      'bar.overall': 'Overall progress {percent}%',
      'bar.task': '{content}, {percent}% complete',
      'status.pending': 'Pending',
      'status.in_progress': 'In progress',
      'status.completed': 'Completed',
      'remind.enable': 'Enable completion reminders',
      'remind.disable': 'Disable completion reminders',
      'toast.remindOn': 'Reminders on',
      'toast.remindOnBody': 'You will be reminded when tasks complete',
      'toast.deniedTitle': 'System notifications not allowed',
      'toast.deniedBody': 'Completion reminders will still appear inside the app',
      'toast.taskDone': 'Task completed',
      'toast.taskDoneBody': '{content} (done {done}/{total})',
      'toast.tasksDoneBody': '{count} more tasks completed (done {done}/{total})',
      'toast.allDone': 'All tasks completed',
      'toast.allDoneBody': 'All {total} tasks are done 🎉',
      'toast.session': 'Session: {title}',
      'toast.dismiss': 'Dismiss reminder'
    };
    const ja = {
      'title': 'タスク進捗',
      'summary': '完了 {done}/{total} · {percent}%',
      'bar.overall': '全体の進捗 {percent}%',
      'bar.task': '{content}、進捗 {percent}%',
      'status.pending': '未着手',
      'status.in_progress': '進行中',
      'status.completed': '完了',
      'remind.enable': 'タスク完了時の通知をオンにする',
      'remind.disable': 'タスク完了時の通知をオフにする',
      'toast.remindOn': '通知をオンにしました',
      'toast.remindOnBody': 'タスクが完了すると通知します',
      'toast.deniedTitle': 'システム通知が許可されていません',
      'toast.deniedBody': '完了通知はアプリ内の表示で続行します',
      'toast.taskDone': 'タスク完了',
      'toast.taskDoneBody': '{content}（完了 {done}/{total}）',
      'toast.tasksDoneBody': 'さらに {count} 件のタスクが完了（完了 {done}/{total}）',
      'toast.allDone': 'すべてのタスクが完了',
      'toast.allDoneBody': '{total} 件のタスクがすべて完了しました 🎉',
      'toast.session': 'セッション：{title}',
      'toast.dismiss': '通知を閉じる'
    };
    const es = {
      'title': 'Progreso de tareas',
      'summary': 'Hechas {done}/{total} · {percent}%',
      'bar.overall': 'Progreso total {percent}%',
      'bar.task': '{content}, {percent}% completado',
      'status.pending': 'Pendiente',
      'status.in_progress': 'En curso',
      'status.completed': 'Completada',
      'remind.enable': 'Activar avisos de finalización',
      'remind.disable': 'Desactivar avisos de finalización',
      'toast.remindOn': 'Avisos activados',
      'toast.remindOnBody': 'Se te avisará cuando terminen las tareas',
      'toast.deniedTitle': 'Notificaciones del sistema no permitidas',
      'toast.deniedBody': 'Los avisos de finalización seguirán apareciendo en la aplicación',
      'toast.taskDone': 'Tarea completada',
      'toast.taskDoneBody': '{content} (hechas {done}/{total})',
      'toast.tasksDoneBody': '{count} tareas más completadas (hechas {done}/{total})',
      'toast.allDone': 'Todas las tareas completadas',
      'toast.allDoneBody': 'Las {total} tareas están terminadas 🎉',
      'toast.session': 'Sesión: {title}',
      'toast.dismiss': 'Cerrar aviso'
    };
    const fr = {
      'title': 'Progression des tâches',
      'summary': 'Terminées {done}/{total} · {percent}%',
      'bar.overall': 'Progression globale {percent}%',
      'bar.task': '{content}, {percent} % terminé',
      'status.pending': 'En attente',
      'status.in_progress': 'En cours',
      'status.completed': 'Terminée',
      'remind.enable': 'Activer les rappels de fin',
      'remind.disable': 'Désactiver les rappels de fin',
      'toast.remindOn': 'Rappels activés',
      'toast.remindOnBody': 'Vous serez averti à la fin des tâches',
      'toast.deniedTitle': 'Notifications système non autorisées',
      'toast.deniedBody': 'Les rappels de fin continueront de s’afficher dans l’application',
      'toast.taskDone': 'Tâche terminée',
      'toast.taskDoneBody': '{content} (terminées {done}/{total})',
      'toast.tasksDoneBody': '{count} tâches de plus terminées (terminées {done}/{total})',
      'toast.allDone': 'Toutes les tâches sont terminées',
      'toast.allDoneBody': 'Les {total} tâches sont terminées 🎉',
      'toast.session': 'Session : {title}',
      'toast.dismiss': 'Fermer le rappel'
    };
    const de = {
      'title': 'Aufgabenfortschritt',
      'summary': 'Fertig {done}/{total} · {percent} %',
      'bar.overall': 'Gesamtfortschritt {percent} %',
      'bar.task': '{content}, {percent} % fertig',
      'status.pending': 'Ausstehend',
      'status.in_progress': 'In Arbeit',
      'status.completed': 'Fertig',
      'remind.enable': 'Erinnerungen bei Abschluss aktivieren',
      'remind.disable': 'Erinnerungen bei Abschluss deaktivieren',
      'toast.remindOn': 'Erinnerungen aktiviert',
      'toast.remindOnBody': 'Du wirst beim Abschluss von Aufgaben erinnert',
      'toast.deniedTitle': 'Systembenachrichtigungen nicht erlaubt',
      'toast.deniedBody': 'Erinnerungen erscheinen weiterhin innerhalb der App',
      'toast.taskDone': 'Aufgabe abgeschlossen',
      'toast.taskDoneBody': '{content} (fertig {done}/{total})',
      'toast.tasksDoneBody': '{count} weitere Aufgaben abgeschlossen (fertig {done}/{total})',
      'toast.allDone': 'Alle Aufgaben abgeschlossen',
      'toast.allDoneBody': 'Alle {total} Aufgaben sind fertig 🎉',
      'toast.session': 'Sitzung: {title}',
      'toast.dismiss': 'Erinnerung schließen'
    };
    const ru = {
      'title': 'Прогресс задач',
      'summary': 'Готово {done}/{total} · {percent}%',
      'bar.overall': 'Общий прогресс {percent}%',
      'bar.task': '{content}, выполнено {percent}%',
      'status.pending': 'Ожидает',
      'status.in_progress': 'В работе',
      'status.completed': 'Выполнено',
      'remind.enable': 'Включить напоминания о завершении',
      'remind.disable': 'Отключить напоминания о завершении',
      'toast.remindOn': 'Напоминания включены',
      'toast.remindOnBody': 'Вы получите напоминание, когда задачи завершатся',
      'toast.deniedTitle': 'Системные уведомления запрещены',
      'toast.deniedBody': 'Напоминания будут показываться внутри приложения',
      'toast.taskDone': 'Задача выполнена',
      'toast.taskDoneBody': '{content} (готово {done}/{total})',
      'toast.tasksDoneBody': 'Ещё {count} задач выполнено (готово {done}/{total})',
      'toast.allDone': 'Все задачи выполнены',
      'toast.allDoneBody': 'Все {total} задач выполнены 🎉',
      'toast.session': 'Сеанс: {title}',
      'toast.dismiss': 'Закрыть напоминание'
    };
    const pt = {
      'title': 'Progresso das tarefas',
      'summary': 'Concluídas {done}/{total} · {percent}%',
      'bar.overall': 'Progresso geral {percent}%',
      'bar.task': '{content}, {percent}% concluído',
      'status.pending': 'Pendente',
      'status.in_progress': 'Em andamento',
      'status.completed': 'Concluída',
      'remind.enable': 'Ativar lembretes de conclusão',
      'remind.disable': 'Desativar lembretes de conclusão',
      'toast.remindOn': 'Lembretes ativados',
      'toast.remindOnBody': 'Você será lembrado quando as tarefas forem concluídas',
      'toast.deniedTitle': 'Notificações do sistema não permitidas',
      'toast.deniedBody': 'Os lembretes de conclusão continuarão aparecendo no aplicativo',
      'toast.taskDone': 'Tarefa concluída',
      'toast.taskDoneBody': '{content} (concluídas {done}/{total})',
      'toast.tasksDoneBody': 'Mais {count} tarefas concluídas (concluídas {done}/{total})',
      'toast.allDone': 'Todas as tarefas concluídas',
      'toast.allDoneBody': 'As {total} tarefas estão concluídas 🎉',
      'toast.session': 'Sessão: {title}',
      'toast.dismiss': 'Fechar lembrete'
    };
    const DICTS = { zh, en, ja, es, fr, de, ru, pt };

    // ── preferences (browser-local, shared by the panel and the reminder monitor) ──

    let preferences = null;
    const preferenceListeners = new Set();

    /** Read the whole preference document, caching it for the module lifetime. */
    function readPreferences() {
      if (preferences !== null) return preferences;
      preferences = { remind: false, collapsed: false };
      try {
        const raw = window.localStorage.getItem(PREF_KEY);
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          if (parsed !== null && typeof parsed === 'object') {
            preferences = { remind: parsed.remind === true, collapsed: parsed.collapsed === true };
          }
        }
      } catch (error) {
        // Storage may be unavailable; session-only defaults are still useful.
      }
      return preferences;
    }

    /** Read one preference flag. */
    function readPreference(name) {
      return readPreferences()[name] === true;
    }

    /** Persist one preference flag and notify every mounted consumer. */
    function writePreference(name, value) {
      preferences = { ...readPreferences(), [name]: value === true };
      try {
        window.localStorage.setItem(PREF_KEY, JSON.stringify(preferences));
      } catch (error) {
        // Persisting is best-effort; the in-memory value still applies.
      }
      for (const listener of [...preferenceListeners]) {
        try {
          listener();
        } catch (error) {
          // A stale listener must not break the toggle.
        }
      }
    }

    /** Subscribe to preference changes; returns the disposer. */
    function subscribePreferences(listener) {
      preferenceListeners.add(listener);
      return () => {
        preferenceListeners.delete(listener);
      };
    }

    /** React binding for one preference flag. */
    function usePreference(name) {
      const [value, setValue] = React.useState(() => readPreference(name));
      React.useEffect(() => subscribePreferences(() => setValue(readPreference(name))), [name]);
      return value;
    }

    // ── toast store (rendered by the shell.overlay stack) ──

    let toasts = [];
    let toastSeq = 0;
    const toastListeners = new Set();

    /** Publish the next toast list to the overlay. */
    function emitToasts(next) {
      toasts = next;
      for (const listener of [...toastListeners]) {
        try {
          listener();
        } catch (error) {
          // One broken listener must not starve the others.
        }
      }
    }

    /** Add one toast; keeps at most four so a burst cannot fill the screen. */
    function pushToast(toast) {
      const id = ++toastSeq;
      emitToasts([...toasts, { ...toast, id }].slice(-4));
      return id;
    }

    /** Remove one toast by id. */
    function dismissToast(id) {
      if (toasts.some((toast) => toast.id === id)) emitToasts(toasts.filter((toast) => toast.id !== id));
    }

    /** Subscribe the overlay to the toast list. */
    function subscribeToasts(listener) {
      toastListeners.add(listener);
      return () => {
        toastListeners.delete(listener);
      };
    }

    // ── completion reminders ──

    const recentlyReminded = new Map();

    /** Cross-channel dedupe so the panel and the monitor cannot double-report one completion. */
    function claimReminder(key) {
      const now = Date.now();
      const last = recentlyReminded.get(key);
      if (last !== undefined && now - last < REMEMBER_WINDOW_MS) return false;
      recentlyReminded.set(key, now);
      if (recentlyReminded.size > 64) {
        for (const [candidate, time] of [...recentlyReminded]) {
          if (now - time > REMEMBER_WINDOW_MS * 4) recentlyReminded.delete(candidate);
        }
      }
      return true;
    }

    /** Report one completion through the in-app toast and, when allowed, a system notification. */
    function reportCompletion(title, body, sessionTitle, t) {
      pushToast({
        title,
        body,
        meta: typeof sessionTitle === 'string' && sessionTitle.length > 0 ? t('toast.session', { title: sessionTitle }) : undefined
      });
      trySystemNotification(title, body);
    }

    /** Best-effort system notification; never throws into the animation frame. */
    function trySystemNotification(title, body) {
      try {
        const NotificationCtor = typeof window !== 'undefined' ? window.Notification : undefined;
        if (typeof NotificationCtor !== 'function' || NotificationCtor.permission !== 'granted') return;
        const notification = new NotificationCtor(title, { body, silent: false });
        window.setTimeout(() => {
          try {
            notification.close();
          } catch (error) {
            // Already closed.
          }
        }, 8000);
      } catch (error) {
        // The system channel is optional; the in-app toast already fired.
      }
    }

    /** Ask for the notification permission once the user turns reminders on. */
    function requestNotificationPermission() {
      try {
        const NotificationCtor = typeof window !== 'undefined' ? window.Notification : undefined;
        if (typeof NotificationCtor !== 'function') return Promise.resolve('unsupported');
        if (NotificationCtor.permission !== 'default') return Promise.resolve(NotificationCtor.permission);
        const result = NotificationCtor.requestPermission();
        if (result !== undefined && typeof result.then === 'function') {
          return result.catch(() => 'denied');
        }
        return Promise.resolve(NotificationCtor.permission);
      } catch (error) {
        return Promise.resolve('unsupported');
      }
    }

    /** Count completed / active tasks and the weighted overall percentage. */
    function summarize(todos) {
      let done = 0;
      let active = 0;
      let weight = 0;
      for (const item of todos) {
        if (item.status === 'completed') done += 1;
        else if (item.status === 'in_progress') active += 1;
        weight += WEIGHT[item.status] ?? 0;
      }
      const total = todos.length;
      return { total, done, active, pending: total - done - active, percent: total === 0 ? 0 : Math.round((weight / total) * 100) };
    }

    /**
     * Emit reminders for one session's newly completed tasks.
     * @param input.sessionId - session identity used for dedupe.
     * @param input.sessionTitle - optional session title shown as toast meta.
     * @param input.todos - full current task list.
     * @param input.newlyDone - contents that changed to completed in this update.
     * @param input.t - bound translator.
     */
    function emitCompletionNotifications(input) {
      if (!readPreference('remind')) return;
      const { sessionId, sessionTitle, todos, newlyDone, t } = input;
      if (!Array.isArray(todos) || newlyDone.length === 0) return;
      const progress = summarize(todos);
      if (progress.done === progress.total && progress.total > 0) {
        if (claimReminder(sessionId + '|*')) {
          reportCompletion(t('toast.allDone'), t('toast.allDoneBody', { total: progress.total }), sessionTitle, t);
        }
        return;
      }
      if (newlyDone.length > 1) {
        if (claimReminder(sessionId + '|batch')) {
          reportCompletion(t('toast.taskDone'), t('toast.tasksDoneBody', { count: newlyDone.length, done: progress.done, total: progress.total }), sessionTitle, t);
        }
        return;
      }
      for (const content of newlyDone) {
        if (!claimReminder(sessionId + '|' + content)) continue;
        reportCompletion(t('toast.taskDone'), t('toast.taskDoneBody', { content, done: progress.done, total: progress.total }), sessionTitle, t);
      }
    }

    /**
     * Watch every session projection the client store carries, so a completion
     * is reported even after the user switched away from that session. Runs for
     * the plugin lifetime; the returned disposer releases both subscriptions.
     */
    function startCompletionMonitor(ctx, t) {
      const sessions = ctx.get('sessions');
      if (sessions === undefined || sessions.list === undefined) return () => {};
      const list = sessions.list;
      let previous = null;
      const refreshed = new Set();

      const seedProjections = () => {
        const state = list.getSnapshot();
        if (state === undefined || state.phase !== 'ready') return;
        for (const sessionId of state.ids ?? []) {
          const summary = state.byId?.[sessionId];
          if (summary?.running !== true || refreshed.has(sessionId)) continue;
          refreshed.add(sessionId);
          try {
            const operation = sessions.refreshProjections?.(sessionId);
            if (operation !== undefined && typeof operation.catch === 'function') operation.catch(() => {});
          } catch (error) {
            // Projection seeding is opportunistic; the live frames still arrive.
          }
        }
      };

      const scan = () => {
        const state = list.getSnapshot();
        if (state === undefined) return;
        const bySession = state.projectionsBySession ?? {};
        const next = new Map();
        for (const sessionId of Object.keys(bySession)) {
          const todos = bySession[sessionId]?.values?.todos;
          if (!Array.isArray(todos) || todos.length === 0) continue;
          next.set(sessionId, { todos, statuses: new Map(todos.map((item) => [item.content, item.status])) });
        }
        const before = previous;
        previous = next;
        if (before === null || !readPreference('remind')) return;
        for (const [sessionId, entry] of next) {
          const prior = before.get(sessionId);
          if (prior === undefined) continue;
          const newlyDone = [];
          for (const [content, status] of entry.statuses) {
            if (status !== 'completed') continue;
            const old = prior.statuses.get(content);
            if (old !== undefined && old !== 'completed') newlyDone.push(content);
          }
          if (newlyDone.length === 0) continue;
          emitCompletionNotifications({
            sessionId,
            sessionTitle: state.byId?.[sessionId]?.title,
            todos: entry.todos,
            newlyDone,
            t
          });
        }
      };

      const stopScan = list.subscribe(scan);
      const stopSeed = list.subscribe(seedProjections);
      scan();
      seedProjections();
      return () => {
        stopScan();
        stopSeed();
      };
    }

    // ── styles (owned by the plugin context; removed with it) ──

    const CSS = `
.tpf_root{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance,0px) - var(--dsh-composer-side-clearance,0px) - var(--dsh-composer-dock-inset,0px) - var(--dsh-composer-dock-inset,0px) - var(--dsh-composer-dock-inset,0px) - var(--dsh-composer-dock-inset,0px));max-width:calc(var(--dsh-composer-card-max-width,46rem) - var(--dsh-composer-dock-inset,0px) - var(--dsh-composer-dock-inset,0px) - var(--dsh-composer-dock-inset,0px) - var(--dsh-composer-dock-inset,0px));flex:none;margin:0 auto;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 1px 3px rgba(0,0,0,.08);overflow:hidden}
.tpf_body{display:flex;flex-direction:column;gap:6px;padding:6px 12px 9px}
.tpf_header{display:flex;align-items:center;gap:6px;min-width:0}
.tpf_toggle{flex:1 1 auto;display:flex;align-items:center;gap:10px;min-width:0;margin:0;padding:2px 4px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.tpf_lead{flex:none;display:grid;place-items:center;color:var(--dsw-alias-label-secondary)}
.tpf_title{flex:none;font-size:13px;font-weight:500;line-height:20px;color:var(--dsw-alias-label-primary)}
.tpf_summary{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:20px;color:var(--dsw-alias-label-secondary)}
.tpf_chevron{flex:none;display:grid;place-items:center;color:var(--dsw-alias-label-secondary)}
.tpf_bell{flex:none;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;margin:0;border:0;border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.tpf_bell[aria-pressed="true"]{color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2);box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary)}
.tpf_toggle:focus-visible,.tpf_bell:focus-visible,.tpf_toastClose:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
@media (hover:hover){.tpf_toggle:hover,.tpf_bell:hover{background:var(--dsw-alias-bg-layer-2)}.tpf_toggle:hover .tpf_title{color:var(--dsw-alias-label-primary)}}
.tpf_track{position:relative;height:5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.tpf_trackFill{height:100%;border-radius:inherit;background:var(--dsw-alias-brand-primary);transition:width .35s ease}
.tpf_trackFill[data-complete="true"]{background:var(--dsw-alias-state-success-primary)}
.tpf_list{display:flex;flex-direction:column;gap:6px;max-height:180px;margin:0;padding:0;list-style:none;overflow-y:auto}
.tpf_item{display:flex;align-items:center;gap:8px;min-width:0}
.tpf_dot{flex:none;width:7px;height:7px;border-radius:999px;background:var(--dsw-alias-state-idle-primary)}
.tpf_dot[data-status="in_progress"]{background:var(--dsw-alias-brand-primary);animation:tpf-pulse 1.8s ease-in-out infinite}
.tpf_dot[data-status="completed"]{background:var(--dsw-alias-state-success-primary)}
.tpf_content{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}
.tpf_item[data-status="completed"] .tpf_content{opacity:.66;text-decoration:line-through}
.tpf_mini{flex:none;width:76px;height:4px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.tpf_miniFill{display:block;height:100%;border-radius:inherit;background:var(--dsw-alias-brand-primary);transition:width .35s ease}
.tpf_miniFill[data-status="completed"]{background:var(--dsw-alias-state-success-primary)}
.tpf_miniFill[data-status="in_progress"]{animation:tpf-pulse 1.8s ease-in-out infinite}
.tpf_pct{flex:none;width:36px;text-align:right;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.tpf_toasts{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:flex;flex-direction:column;gap:8px;max-width:340px;pointer-events:none}
.tpf_toast{pointer-events:auto;display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-overlay);box-shadow:0 6px 24px rgba(0,0,0,.18);color:var(--dsw-alias-label-primary);animation:tpf-slide-in .18s ease-out}
.tpf_toastIcon{flex:none;display:grid;place-items:center;margin-top:1px;color:var(--dsw-alias-state-success-primary)}
.tpf_toastBody{flex:1 1 auto;display:flex;flex-direction:column;gap:2px;min-width:0}
.tpf_toastTitle{font-size:13px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-primary)}
.tpf_toastText{font-size:12px;line-height:17px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.tpf_toastMeta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:15px;color:var(--dsw-alias-label-secondary);opacity:.8}
.tpf_toastClose{flex:none;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;margin:0;border:0;border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.tpf_toastClose:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
@keyframes tpf-pulse{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes tpf-slide-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion: reduce){.tpf_dot,.tpf_miniFill,.tpf_trackFill,.tpf_toast{animation:none;transition:none}}
`;

    /** Insert the package stylesheet once; returns the cleanup. */
    function installStyles() {
      const existing = document.querySelector('style[data-plugin-css="' + STYLE_KEY + '"]');
      if (existing !== null) return () => {};
      const tag = document.createElement('style');
      tag.setAttribute('data-plugin', PLUGIN_ID);
      tag.setAttribute('data-plugin-css', STYLE_KEY);
      tag.textContent = CSS;
      document.head.appendChild(tag);
      return () => {
        if (tag.parentNode !== null) tag.parentNode.removeChild(tag);
      };
    }

    // ── icons (original artwork, drawn with currentColor) ──

    /** Decorative checklist glyph used in the panel header. */
    function ChecklistIcon() {
      return h('svg', { viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true, focusable: false, fill: 'none' },
        h('path', { d: 'M2.2 3.9l1.1 1.1L5.2 3', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M8 4.4h5.8', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }),
        h('path', { d: 'M2.2 8.4l1.1 1.1 1.9-2', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M8 8.9h5.8', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }),
        h('circle', { cx: 3.3, cy: 12.6, r: 1, fill: 'currentColor' }),
        h('path', { d: 'M8 12.6h5.8', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' })
      );
    }

    /** Disclosure chevron for the collapsible task list. */
    function ChevronIcon({ up }) {
      return h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true, focusable: false, fill: 'none' },
        h('path', {
          d: up ? 'M3.5 10L8 5.5 12.5 10' : 'M3.5 6L8 10.5 12.5 6',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round'
        })
      );
    }

    /** Bell glyph; the filled dot marks "reminders on". */
    function BellIcon({ on }) {
      return h('svg', { viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true, focusable: false, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' },
        h('path', { d: 'M8 1.9a3.7 3.7 0 0 1 3.7 3.7c0 2.5.7 3.7 1.5 4.5H2.8c.8-.8 1.5-2 1.5-4.5A3.7 3.7 0 0 1 8 1.9Z' }),
        h('path', { d: 'M6.4 12.2a1.6 1.6 0 0 0 3.2 0' }),
        on ? h('circle', { cx: 12.7, cy: 3.3, r: 2, fill: 'currentColor', stroke: 'none' }) : null
      );
    }

    /** Completion glyph used by toasts. */
    function ToastCheckIcon() {
      return h('svg', { viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true, focusable: false, fill: 'none' },
        h('circle', { cx: 8, cy: 8, r: 6.4, stroke: 'currentColor', strokeWidth: 1.3 }),
        h('path', { d: 'M5.2 8.2l1.9 1.9 3.7-4', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' })
      );
    }

    /** Close glyph for the toast dismiss action. */
    function CloseIcon() {
      return h('svg', { viewBox: '0 0 16 16', width: 12, height: 12, 'aria-hidden': true, focusable: false, fill: 'none' },
        h('path', { d: 'M4 4l8 8M12 4l-8 8', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' })
      );
    }

    // ── components ──

    /**
     * One task row: status dot, task text, approximate progress bar and percent.
     * The bar width is the approximate weight (0 / 50 / 100 %) of the status.
     */
    function TaskRow({ item, t }) {
      const percent = Math.round((WEIGHT[item.status] ?? 0) * 100);
      return h('li', { className: 'tpf_item', 'data-status': item.status },
        h('span', { className: 'tpf_dot', 'data-status': item.status, role: 'img', 'aria-label': t('status.' + item.status) }),
        h('span', { className: 'tpf_content', title: item.content }, item.content),
        h('span', {
          className: 'tpf_mini',
          role: 'progressbar',
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'aria-valuenow': percent,
          'aria-label': t('bar.task', { content: item.content, percent })
        }, h('span', { className: 'tpf_miniFill', 'data-status': item.status, style: { width: percent + '%' } })),
        h('span', { className: 'tpf_pct', 'aria-hidden': true }, percent + '%')
      );
    }

    /**
     * The dock panel. Mounted once per visible session view; `useProjection`
     * supplies the live `todos` projection and `t` is bound by the slot catalog.
     */
    function TaskProgressPanel({ useProjection, sessionId, t }) {
      const projected = useProjection('todos');
      const todos = Array.isArray(projected) ? projected : [];
      const remind = usePreference('remind');
      const collapsed = usePreference('collapsed');
      const previous = React.useRef(null);

      // Panel-side completion detection (the active session is always covered,
      // even if the cross-session monitor has not seeded its projections yet).
      React.useEffect(() => {
        const next = new Map(todos.map((item) => [item.content, item.status]));
        const before = previous.current;
        previous.current = next;
        if (before === null || !readPreference('remind')) return;
        const newlyDone = [];
        for (const [content, status] of next) {
          if (status !== 'completed') continue;
          const old = before.get(content);
          if (old !== undefined && old !== 'completed') newlyDone.push(content);
        }
        if (newlyDone.length === 0) return;
        emitCompletionNotifications({
          sessionId: typeof sessionId === 'string' ? sessionId : 'session',
          sessionTitle: undefined,
          todos,
          newlyDone,
          t
        });
      }, [todos, sessionId, t]);

      if (todos.length === 0) return null;

      const progress = summarize(todos);
      const summary = t('summary', { done: progress.done, total: progress.total, percent: progress.percent });

      const toggleCollapsed = () => {
        writePreference('collapsed', !readPreference('collapsed'));
      };

      const toggleRemind = () => {
        const next = !readPreference('remind');
        writePreference('remind', next);
        if (!next) return;
        pushToast({ title: t('toast.remindOn'), body: t('toast.remindOnBody') });
        requestNotificationPermission().then((state) => {
          if (state === 'denied') {
            pushToast({ title: t('toast.deniedTitle'), body: t('toast.deniedBody') });
          }
        });
      };

      return h('section', { className: 'tpf_root', 'data-testid': 'task-progress-panel', 'aria-label': t('title') },
        h('div', { className: 'tpf_body' },
          h('div', { className: 'tpf_header' },
            h('button', {
              type: 'button',
              className: 'tpf_toggle',
              'aria-expanded': !collapsed,
              onClick: toggleCollapsed
            },
              h('span', { className: 'tpf_lead', 'aria-hidden': true }, h(ChecklistIcon)),
              h('span', { className: 'tpf_title' }, t('title')),
              h('span', { className: 'tpf_summary' }, summary),
              h('span', { className: 'tpf_chevron', 'aria-hidden': true }, h(ChevronIcon, { up: !collapsed }))
            ),
            h('button', {
              type: 'button',
              className: 'tpf_bell',
              'aria-pressed': remind,
              'aria-label': remind ? t('remind.disable') : t('remind.enable'),
              title: remind ? t('remind.disable') : t('remind.enable'),
              onClick: toggleRemind
            }, h(BellIcon, { on: remind }))
          ),
          h('div', {
            className: 'tpf_track',
            role: 'progressbar',
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-valuenow': progress.percent,
            'aria-label': t('bar.overall', { percent: progress.percent })
          }, h('div', {
            className: 'tpf_trackFill',
            'data-complete': progress.percent >= 100 ? 'true' : 'false',
            style: { width: progress.percent + '%' }
          })),
          collapsed ? null : h('ul', { className: 'tpf_list' }, todos.map((item) => h(TaskRow, { key: item.content, item, t })))
        )
      );
    }

    /** One toast card; auto-dismisses and can be closed by hand. */
    function ToastCard({ toast, t }) {
      React.useEffect(() => {
        const timer = window.setTimeout(() => dismissToast(toast.id), TOAST_LIFETIME_MS);
        return () => window.clearTimeout(timer);
      }, [toast.id]);
      return h('div', { className: 'tpf_toast', role: 'status' },
        h('span', { className: 'tpf_toastIcon', 'aria-hidden': true }, h(ToastCheckIcon)),
        h('div', { className: 'tpf_toastBody' },
          h('span', { className: 'tpf_toastTitle' }, toast.title),
          h('span', { className: 'tpf_toastText' }, toast.body),
          toast.meta === undefined ? null : h('span', { className: 'tpf_toastMeta' }, toast.meta)
        ),
        h('button', {
          type: 'button',
          className: 'tpf_toastClose',
          'aria-label': t('toast.dismiss'),
          title: t('toast.dismiss'),
          onClick: () => dismissToast(toast.id)
        }, h(CloseIcon))
      );
    }

    /** The frame-wide toast stack registered into `shell.overlay`. */
    function ToastStack({ t }) {
      const [items, setItems] = React.useState(() => toasts);
      React.useEffect(() => {
        setItems(toasts);
        return subscribeToasts(() => setItems(toasts));
      }, []);
      if (items.length === 0) return null;
      return h('div', { className: 'tpf_toasts', 'aria-live': 'polite' },
        items.map((toast) => h(ToastCard, { key: toast.id, toast, t }))
      );
    }

    // ── plugin ──

    /** Required client services: slot registry, locale registry, session store. */
    const inject = ['slots', 'locale', 'sessions'];

    /**
     * Register the dictionaries, the stylesheet, the progress dock and the
     * reminder monitor. Every resource is owned by this plugin's context.
     * @param ctx - client root context.
     */
    function apply(ctx) {
      const unregister = ctx.locale.register(NS, DICTS);
      ctx.effect(() => unregister, 'task-progress: dictionaries');
      const t = ctx.locale.bind(NS);
      ctx.effect(installStyles, 'task-progress: styles');
      ctx.effect(() => startCompletionMonitor(ctx, t), 'task-progress: completion monitor');
      // Reusing the shipped cell id replaces the built-in todo dock; the lower
      // priority keeps this registration the winner of the cell regardless of
      // which plugin happened to activate first.
      ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
        name: 'conversation.input.dock',
        id: 'todo',
        order: 0,
        priority: -100,
        locale: NS
      }, TaskProgressPanel));
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'task-progress.toasts',
        order: 100,
        locale: NS
      }, ToastStack));
    }

    return { inject, apply };
  }
});
