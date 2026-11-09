const express = require('express');
const cors = require('cors');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

// Автоматически очищаем старую базу данных при изменении кода бэкенда
const dbPath = path.join(__dirname, 'library.db');
if (fs.existsSync(dbPath)) {
    try { fs.unlinkSync(dbPath); } catch(e) {}
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

let db;

async function initDb() {
    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    await db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL,
      title TEXT NOT NULL,
      year INTEGER,
      genre TEXT,
      copies INTEGER,
      desc TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      pass TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bookId INTEGER,
      email TEXT,
      date TEXT,
      due TEXT
    );
  `);

    const count = await db.get('SELECT COUNT(*) as count FROM books');
    if (count.count === 0) {
        const seed = [
            ["Іван Франко", "Захар Беркут", 1883, "Історична проза", 3, "Історична повість про боротьбу карпатської громади тухольців..."],
            ["Леся Українка", "Лісова пісня", 1911, "Драма", 2, "Драма-феєрія про кохання лісової русалки Мавки..."],
            ["Тарас Шевченко", "Кобзар", 1840, "Поезія", 4, "Збірка поезій, що стала символом української літератури..."],
            ["Михайло Коцюбинський", "Тіні забутих предків", 1911, "Проза", 2, "Повість про кохання Івана й Марічки..."],
            ["Ліна Костенко", "Маруся Чурай", 1979, "Поезія", 2, "Роман у віршах про полтавську співачку..."],
            ["Іван Багряний", "Тигролови", 1944, "Проза", 3, "Пригодницький роман про втечу з ув’язнення..."],
            ["Е. Таненбаум", "Комп’ютерні мережі", 2011, "Наукова", 2, "Класичний підручник про принципи..."],
            ["Б. Керніган, Д. Річі", "Мова програмування C", 1978, "Навчальна", 2, "Класичний посібник від авторів мови C..."],
            ["Роберт Мартін", "Чистий код", 2008, "Навчальна", 2, "Посібник з написання зрозумілого коду..."]
        ];
        for (const b of seed) {
            await db.run('INSERT INTO books (author, title, year, genre, copies, desc) VALUES (?, ?, ?, ?, ?, ?)', b);
        }
        // Перезаписываем пользователя со стандартным текстовым паролем
        await db.run('INSERT OR REPLACE INTO users (id, name, email, pass) VALUES (1, "Демо Читач", "demo@library.ua", "123456")');
    }
}

app.get('/api/data', async (req, res) => {
    const books = await db.all('SELECT * FROM books');
    const loans = await db.all('SELECT * FROM loans');
    res.json({ books, loans });
});

app.post('/api/register', async (req, res) => {
    const { name, email, pass } = req.body;
    try {
        await db.run('INSERT INTO users (name, email, pass) VALUES (?, ?, ?)', [name, email, pass]);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: "Користувач вже існує" });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, pass } = req.body;
    console.log(`[SERVER] Спроба входу: ${email} з паролем: ${pass}`);

    const user = await db.get('SELECT name, email FROM users WHERE email = ? AND pass = ?', [email, pass]);
    if (user) {
        console.log(`[SERVER] Успішний вхід: ${user.name}`);
        res.json({ success: true, user });
    } else {
        console.log(`[SERVER] Помилка входу для: ${email}`);
        res.json({ success: false, error: "Невірна пошта або пароль" });
    }
});

app.post('/api/loans', async (req, res) => {
    const { bookId, email, date, due } = req.body;
    await db.run('INSERT INTO loans (bookId, email, date, due) VALUES (?, ?, ?, ?)', [bookId, email, date, due]);
    res.json({ success: true });
});

app.delete('/api/loans/:id', async (req, res) => {
    await db.run('DELETE FROM loans WHERE id = ?', req.params.id);
    res.json({ success: true });
});

const PORT = 3000;
initDb().then(() => {
    app.listen(PORT, () => console.log(`Сервер запущено на http://localhost:${PORT}`));
});