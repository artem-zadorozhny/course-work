(function () {
  const K = { books: 'lib_books', users: 'lib_users', loans: 'lib_loans', ses: 'lib_session' };

  const SEED = [
    { id: 1, author: 'Іван Франко', title: 'Захар Беркут', year: 1883, genre: 'Історична проза', copies: 3,
      desc: 'Історична повість про боротьбу карпатської громади тухольців проти монгольської навали та боярина Тугара Вовка.' },
    { id: 2, author: 'Леся Українка', title: 'Лісова пісня', year: 1911, genre: 'Драма', copies: 2,
      desc: 'Драма-феєрія про кохання лісової русалки Мавки та юного Лукаша на тлі волинської природи.' },
    { id: 3, author: 'Тарас Шевченко', title: 'Кобзар', year: 1840, genre: 'Поезія', copies: 4,
      desc: 'Збірка поезій, що стала символом української літератури та національної ідентичності.' },
    { id: 4, author: 'Михайло Коцюбинський', title: 'Тіні забутих предків', year: 1911, genre: 'Проза', copies: 2,
      desc: 'Повість про кохання Івана й Марічки на тлі гуцульських повір’їв і карпатської природи.' },
    { id: 5, author: 'Ліна Костенко', title: 'Маруся Чурай', year: 1979, genre: 'Поезія', copies: 2,
      desc: 'Роман у віршах про полтавську співачку й поетесу Марусю Чурай та її долю.' },
    { id: 6, author: 'Іван Багряний', title: 'Тигролови', year: 1944, genre: 'Проза', copies: 3,
      desc: 'Пригодницький роман про втечу з ув’язнення та боротьбу за свободу в тайзі.' },
    { id: 7, author: 'Е. Таненбаум', title: 'Комп’ютерні мережі', year: 2011, genre: 'Наукова', copies: 2,
      desc: 'Класичний підручник про принципи побудови й роботи комп’ютерних мереж.' },
    { id: 8, author: 'Б. Керніган, Д. Річі', title: 'Мова програмування C', year: 1978, genre: 'Навчальна', copies: 2,
      desc: 'Класичний посібник від авторів мови C: короткий і точний вступ до програмування.' },
    { id: 9, author: 'Роберт Мартін', title: 'Чистий код', year: 2008, genre: 'Навчальна', copies: 2,
      desc: 'Посібник з написання зрозумілого, підтримуваного коду та практик рефакторингу.' }
  ];

  const $ = id => document.getElementById(id);
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const hash = s => { let h = 5381; for (const ch of s) h = ((h << 5) + h + ch.charCodeAt(0)) | 0; return String(h); };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const user = () => get(K.ses, null);
  const free = b => b.copies - get(K.loans, []).filter(l => l.bookId === b.id).length;
  const fmt = d => d.toLocaleDateString('uk-UA');

  function init() {
    if (!localStorage.getItem(K.books)) set(K.books, SEED);
    if (!localStorage.getItem(K.users)) set(K.users, [{ name: 'Демо Читач', email: 'demo@library.ua', pass: hash('123456') }]);
    const genres = [...new Set(get(K.books, []).map(b => b.genre))];
    $('lib-genre').innerHTML = '<option value="">Усі жанри</option>' + genres.map(g => `<option>${esc(g)}</option>`).join('');
  }

  function msg(text, ok) {
    const m = $('lib-msg');
    m.textContent = text;
    m.className = 'msg ' + (ok ? 'ok' : 'err');
  }

  function render() {
    const u = user(), loans = get(K.loans, []);
    $('auth-out').hidden = !!u;
    $('auth-in').hidden = !u;
    if (u) $('who').textContent = u.name;

    const q = $('lib-q').value.trim().toLowerCase(), g = $('lib-genre').value;
    const list = get(K.books, []).filter(b => (!g || b.genre === g) && (b.title + ' ' + b.author).toLowerCase().includes(q));
    $('lib-list').innerHTML = list.length ? list.map(b => {
      const f = free(b), mine = u && loans.some(l => l.bookId === b.id && l.email === u.email);
      const btn = mine ? '<button type="button" disabled>Заброньовано вами</button>'
        : `<button type="button" data-book="${b.id}" ${f < 1 ? 'disabled' : ''}>${f < 1 ? 'Немає в наявності' : 'Забронювати'}</button>`;
      return `<article class="book-card"><h3>${esc(b.title)}</h3>
        <p><strong>${esc(b.author)}</strong>, ${b.year} р. <span class="badge">${esc(b.genre)}</span></p>
        <details><summary>Опис</summary><p>${esc(b.desc)}</p></details>
        <p>Вільно примірників: <strong>${f}</strong> з ${b.copies}</p>${btn}</article>`;
    }).join('') : '<p>Нічого не знайдено.</p>';

    const my = u ? loans.filter(l => l.email === u.email) : [];
    const books = get(K.books, []);
    $('my-loans').innerHTML = !u ? '<p>Увійдіть, щоб побачити свої бронювання.</p>'
      : !my.length ? '<p>Активних бронювань немає.</p>'
      : '<table><thead><tr><th>Книга</th><th>Заброньовано</th><th>Повернути до</th><th></th></tr></thead><tbody>' +
        my.map(l => {
          const b = books.find(x => x.id === l.bookId);
          return `<tr><td>${esc(b ? b.title : '—')}</td><td>${l.date}</td><td>${l.due}</td><td><button type="button" data-cancel="${l.id}">Скасувати</button></td></tr>`;
        }).join('') + '</tbody></table>';
  }

  function book(id) {
    const u = user();
    if (!u) return msg('Спочатку увійдіть у систему.', false);
    const loans = get(K.loans, []), b = get(K.books, []).find(x => x.id === id);
    if (loans.filter(l => l.email === u.email).length >= 3) return msg('Можна мати не більше 3 активних бронювань.', false);
    if (!b || free(b) < 1) return msg('Немає вільних примірників.', false);
    const due = new Date(Date.now() + 14 * 864e5);
    loans.push({ id: Date.now(), bookId: id, email: u.email, date: fmt(new Date()), due: fmt(due) });
    set(K.loans, loans);
    msg(`Книгу «${b.title}» заброньовано до ${fmt(due)}.`, true);
    render();
  }

  init();
  render();

  $('lib-q').addEventListener('input', render);
  $('lib-genre').addEventListener('change', render);

  $('lib-list').addEventListener('click', e => {
    const id = e.target.dataset.book;
    if (id) book(Number(id));
  });

  $('my-loans').addEventListener('click', e => {
    const id = e.target.dataset.cancel;
    if (!id) return;
    set(K.loans, get(K.loans, []).filter(l => String(l.id) !== id));
    msg('Бронювання скасовано.', true);
    render();
  });

  $('reg-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('rg-name').value.trim(), email = $('rg-email').value.trim().toLowerCase(), pass = $('rg-pass').value;
    const users = get(K.users, []);
    if (users.some(x => x.email === email)) return msg('Користувач з такою поштою вже існує.', false);
    users.push({ name, email, pass: hash(pass) });
    set(K.users, users);
    set(K.ses, { name, email });
    e.target.reset();
    msg('Реєстрація успішна, ви увійшли в систему.', true);
    render();
  });

  $('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const email = $('lg-email').value.trim().toLowerCase(), pass = hash($('lg-pass').value);
    const u = get(K.users, []).find(x => x.email === email && x.pass === pass);
    if (!u) return msg('Невірна пошта або пароль.', false);
    set(K.ses, { name: u.name, email: u.email });
    e.target.reset();
    msg('Вітаємо, ' + u.name + '!', true);
    render();
  });

  $('logout').addEventListener('click', () => {
    localStorage.removeItem(K.ses);
    msg('Ви вийшли з системи.', true);
    render();
  });

  $('lib-reset').addEventListener('click', () => {
    Object.values(K).forEach(k => localStorage.removeItem(k));
    init();
    msg('Базу даних скинуто до початкового стану.', true);
    render();
  });
})();