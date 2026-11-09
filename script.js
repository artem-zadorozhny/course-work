(function () {
  // Константы сессии
  const K = { ses: "lib_session" };

  // Переменные для данных с сервера
  let SERVER_BOOKS = [];
  let SERVER_LOANS = [];

  // Функция поиска элементов ( document.getElementById )
  const $ = (id) => document.getElementById(id);

  const getSes = () => JSON.parse(localStorage.getItem(K.ses)) || null;
  const setSes = (v) => localStorage.setItem(K.ses, JSON.stringify(v));

  const hash = (s) => {
    let h = 5381;
    for (const ch of s) h = ((h << 5) + h + ch.charCodeAt(0)) | 0;
    return String(h);
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);

  const user = () => getSes();
  const free = (b) => b.copies - SERVER_LOANS.filter((l) => l.bookId === b.id).length;
  const fmt = (d) => d.toLocaleDateString("uk-UA");

  // Синхронизация с сервером БД
  async function syncWithServer() {
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      SERVER_BOOKS = data.books;
      SERVER_LOANS = data.loans;
    } catch (e) {
      console.error("Помилка зв'язку з сервером", e);
    }
  }

  // Главная инициализация
  async function init() {
    await syncWithServer();

    const genres = [...new Set(SERVER_BOOKS.map((b) => b.genre))];
    $("lib-genre").innerHTML = '<option value="">Усі жанри</option>' + genres.map((g) => `<option>${esc(g)}</option>`).join("");

    render();
  }

  function msg(text, ok) {
    const m = $("lib-msg");
    if (m) {
      m.textContent = text;
      m.className = "msg " + (ok ? "ok" : "err");
    }
  }

  // Отрисовка интерфейса
  function render() {
    const u = user();
    $("auth-out").hidden = !!u;
    $("auth-in").hidden = !u;
    if (u) $("who").textContent = u.name;

    const q = $("lib-q").value.trim().toLowerCase(), g = $("lib-genre").value;

    const list = SERVER_BOOKS.filter(
        (b) => (!g || b.genre === g) && (b.title + " " + b.author).toLowerCase().includes(q)
    );

    $("lib-list").innerHTML = list.length
        ? list.map((b) => {
          const f = free(b), mine = u && SERVER_LOANS.some((l) => l.bookId === b.id && l.email === u.email);
          const btn = mine
              ? '<button type="button" disabled>Заброньовано вами</button>'
              : `<button type="button" data-book="${b.id}" ${f < 1 ? "disabled" : ""}>${f < 1 ? "Немає в наявності" : "Забронювати"}</button>`;
          return `<article class="book-card"><h3>${esc(b.title)}</h3>
        <p><strong>${esc(b.author)}</strong>, ${b.year} р. <span class="badge">${esc(b.genre)}</span></p>
        <details><summary>Опис</summary><p>${esc(b.desc)}</p></details>
        <p>Вільно примірників: <strong>${f}</strong> з ${b.copies}</p>${btn}</article>`;
        }).join("")
        : "<p>Нічого не знайдено.</p>";

    const my = u ? SERVER_LOANS.filter((l) => l.email === u.email) : [];
    $("my-loans").innerHTML = !u
        ? "<p>Увійдіть, щоб побачити свої бронювання.</p>"
        : !my.length
            ? "<p>Активних бронювань немає.</p>"
            : "<table><thead><tr><th>Книга</th><th>Заброньовано</th><th>Повернути до</th><th></th></tr></thead><tbody>" +
            my.map((l) => {
              const b = SERVER_BOOKS.find((x) => x.id === l.bookId);
              return `<tr><td>${esc(b ? b.title : "—")}</td><td>${l.date}</td><td>${l.due}</td><td><button type="button" data-cancel="${l.id}">Скасувати</button></td></tr>`;
            }).join("") + "</tbody></table>";
  }

  // Бронирование
  async function book(id) {
    const u = user();
    if (!u) return msg("Спочатку увійдіть у систему.", false);

    if (SERVER_LOANS.filter((l) => l.email === u.email).length >= 3)
      return msg("Можна мати не більше 3 activeних бронювань.", false);

    const b = SERVER_BOOKS.find((x) => x.id === id);
    if (!b || free(b) < 1) return msg("Немає вільних примірников.", false);

    const due = new Date(Date.now() + 14 * 864e5);

    const res = await fetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId: id,
        email: u.email,
        date: fmt(new Date()),
        due: fmt(due)
      })
    });

    if (res.ok) {
      await syncWithServer();
      msg(`Книгу «${b.title}» заброньовано до ${fmt(due)}.`, true);
      render();
    }
  }

  // Запуск обработчиков
  init();

  $("lib-q").addEventListener("input", render);
  $("lib-genre").addEventListener("change", render);

  $("lib-list").addEventListener("click", (e) => {
    const id = e.target.dataset.book;
    if (id) book(Number(id));
  });

  $("my-loans").addEventListener("click", async (e) => {
    const id = e.target.dataset.cancel;
    if (!id) return;

    const res = await fetch(`/api/loans/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await syncWithServer();
      msg("Бронювання скасовано.", true);
      render();
    }
  });

  // Обработчики форм в самом конце файла
  $("reg-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const name = $("rg-name").value.trim(), email = $("rg-email").value.trim().toLowerCase(), pass = $("rg-pass").value;

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, pass })
      });
      const data = await res.json();

      if (data.success) {
        setSes({ name, email });
        e.target.reset();
        msg("Реєстрація успішна, ви увійшли в систему.", true);
        await syncWithServer();
        render();
      } else {
        msg(data.error, false);
      }
    } catch (err) {
      console.error(err);
      msg("Сталася помилка на клієнті.", false);
    }
  });

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const email = $("lg-email").value.trim().toLowerCase(), pass = $("lg-pass").value;

      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pass })
      });
      const data = await res.json();

      if (data.success) {
        setSes(data.user);
        e.target.reset();
        msg("Вітаємо, " + data.user.name + "!", true);
        await syncWithServer();
        render();
      } else {
        msg(data.error, false);
      }
    } catch (err) {
      console.error(err);
      msg("Сталася помилка зв'язку з сервером.", false);
    }
  });

  $("logout").addEventListener("click", () => {
    localStorage.removeItem(K.ses);
    msg("Ви вийшли з системи.", true);
    render();
  });
})();