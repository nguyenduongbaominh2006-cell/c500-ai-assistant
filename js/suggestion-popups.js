
/* C500 AI Assistant — suggested-question popups.
   Mount below the avatar or below an AI reply. */
(function () {
  'use strict';

  const TOPICS = {
    'Nội quy': [
      'Học viên cần lưu ý những nội quy nào hằng ngày?',
      'Quy định về giờ giấc và điểm danh là gì?',
      'Tôi nên làm gì khi cần xin phép vắng mặt?'
    ],
    'Sơ đồ trường': [
      'Thư viện nằm ở khu vực nào trong trường?',
      'Làm thế nào để tìm phòng học của mình?',
      'Khu vực ăn uống và sinh hoạt ở đâu?'
    ],
    'Bảo mật': [
      'Những nguyên tắc bảo mật thông tin cơ bản là gì?',
      'Tôi nên xử lý thế nào khi nhận được liên kết đáng ngờ?',
      'Làm sao để bảo vệ tài khoản và mật khẩu cá nhân?'
    ],
    'Học tập': [
      'Hãy giúp tôi lập kế hoạch học tập trong tuần.',
      'Có phương pháp nào ghi nhớ kiến thức hiệu quả hơn?',
      'Tôi nên chuẩn bị thế nào trước kỳ kiểm tra?'
    ],
    'Trợ lý AI': [
      'Bạn có thể giúp tôi những việc gì?',
      'Hãy giải thích một khái niệm theo cách dễ hiểu.',
      'Tóm tắt nội dung này thành các ý chính giúp tôi.'
    ]
  };

  const STYLE_ID = 'c500-suggestion-popup-styles';

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;

    style.textContent = `
      .c500-suggestions {
        font: inherit;
        color: var(--c500-suggest-text, #eaf1f5);
        margin: 12px 0;
        padding: 12px;
        border: 1px solid rgba(197,160,89,.35);
        border-radius: 14px;
        background: var(--c500-suggest-bg, rgba(13,28,39,.94));
        box-sizing: border-box;
      }

      .c500-suggestions__heading {
        font-size: .9rem;
        font-weight: 700;
        margin: 0 0 10px;
        color: var(--c500-suggest-accent, #d7b76b);
      }

      .c500-suggestions__tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin-bottom: 10px;
      }

      .c500-suggestions__tab,
      .c500-suggestions__question {
        font: inherit;
        cursor: pointer;
        border: 1px solid rgba(197,160,89,.38);
        border-radius: 999px;
        padding: 7px 11px;
        background: rgba(255,255,255,.045);
        color: inherit;
        transition: background .15s, border-color .15s;
      }

      .c500-suggestions__tab[aria-selected="true"] {
        background: rgba(197,160,89,.2);
        border-color: #c5a059;
        color: #ffe6a4;
      }

      .c500-suggestions__list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .c500-suggestions__question {
        border-radius: 10px;
        text-align: left;
        line-height: 1.35;
        max-width: 100%;
      }

      .c500-suggestions__tab:hover,
      .c500-suggestions__question:hover {
        background: rgba(197,160,89,.16);
        border-color: #c5a059;
      }

      .c500-suggestions button:focus-visible {
        outline: 2px solid #f0cf7b;
        outline-offset: 2px;
      }

      .c500-suggestions--compact {
        padding: 9px;
        margin-top: 9px;
      }

      @media (max-width: 600px) {
        .c500-suggestions__tab,
        .c500-suggestions__question {
          font-size: .88rem;
        }

        .c500-suggestions__list {
          display: grid;
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function resolveElement(target) {
    if (typeof target === 'string') {
      return document.querySelector(target);
    }

    return target && target.nodeType === 1 ? target : null;
  }

  function mount(target, options) {
    const host = resolveElement(target);

    if (!host) {
      console.warn(
        '[C500Suggestions] Không tìm thấy vùng hiển thị:',
        target
      );
      return null;
    }

    addStyles();

    const opts = Object.assign({
      title: 'Bạn có thể hỏi trợ lý',
      placement: 'avatar',
      compact: false,
      initialTopic: 'Nội quy',
      onSelect: null
    }, options || {});

    const panel = document.createElement('section');

    panel.className =
      'c500-suggestions' +
      (opts.compact ? ' c500-suggestions--compact' : '');

    panel.setAttribute('aria-label', 'Câu hỏi gợi ý');

    const heading = document.createElement('p');
    heading.className = 'c500-suggestions__heading';
    heading.textContent = opts.title;

    const tabs = document.createElement('div');
    tabs.className = 'c500-suggestions__tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Chủ đề câu hỏi');

    const list = document.createElement('div');
    list.className = 'c500-suggestions__list';

    panel.append(heading, tabs, list);
    host.appendChild(panel);

    let activeTopic =
      Object.prototype.hasOwnProperty.call(TOPICS, opts.initialTopic)
        ? opts.initialTopic
        : Object.keys(TOPICS)[0];

    function chooseQuestion(question) {
      if (typeof opts.onSelect === 'function') {
        opts.onSelect(question, {
          topic: activeTopic,
          placement: opts.placement
        });
      } else {
        panel.dispatchEvent(new CustomEvent(
          'c500:suggestion-select',
          {
            bubbles: true,
            detail: {
              question,
              topic: activeTopic,
              placement: opts.placement
            }
          }
        ));
      }
    }

    function render() {
      tabs.replaceChildren();
      list.replaceChildren();

      Object.keys(TOPICS).forEach(topic => {
        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'c500-suggestions__tab';
        button.textContent = topic;
        button.setAttribute('role', 'tab');
        button.setAttribute(
          'aria-selected',
          String(topic === activeTopic)
        );

        button.addEventListener('click', () => {
          activeTopic = topic;
          render();
        });

        tabs.appendChild(button);
      });

      TOPICS[activeTopic].forEach(question => {
        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'c500-suggestions__question';
        button.textContent = question;

        button.addEventListener('click', () => {
          chooseQuestion(question);
        });

        list.appendChild(button);
      });
    }

    render();

    return {
      element: panel,

      setTopic(topic) {
        if (!Object.prototype.hasOwnProperty.call(TOPICS, topic)) {
          return false;
        }

        activeTopic = topic;
        render();
        return true;
      },

      setTitle(title) {
        heading.textContent = String(title || '');
      },

      renderForReply(replyTarget) {
        const reply = resolveElement(replyTarget);
        if (!reply) return null;

        const mountPoint = document.createElement('div');
        reply.appendChild(mountPoint);

        return mount(mountPoint, {
          ...opts,
          title: 'Câu hỏi liên quan',
          compact: true,
          placement: 'reply',
          initialTopic: activeTopic
        });
      },

      destroy() {
        panel.remove();
      }
    };
  }

  window.C500Suggestions = {
    mount,
    topics: TOPICS
  };
})();
