# 🚀 Деплой AI Chat Hub

## Архитектура

```
┌─────────────────────────┐     ┌─────────────────────────┐
│   GitHub Pages          │     │   Render.com (Free)     │
│   (Frontend SPA)        │────▶│   (Backend API)         │
│                         │     │                         │
│   HTML + CSS + JS       │     │   Express + SQLite      │
│   React App             │     │   MCP Client            │
└─────────────────────────┘     └─────────────────────────┘
```

**Frontend** → GitHub Pages (бесплатно)  
**Backend** → Render.com Free Web Service (бесплатно, засыпает через 15 мин неактивности)

---

## Шаг 1: Загрузить код в GitHub

### 1.1. Инициализировать Git

```bash
cd ai-chat-hub
git init
git add .
git commit -m "Initial commit: AI Chat Hub"
```

### 1.2. Подключить репозиторий

```bash
git remote add origin https://github.com/podshoevbunyod16-sketch/Khirad.git
git branch -M main
git push -u origin main
```

---

## Шаг 2: Деплой Backend на Render.com

### 2.1. Зарегистрироваться

1. Перейти на https://render.com
2. Нажать **Get Started for Free**
3. Войти через GitHub

### 2.2. Создать Web Service

1. В Dashboard нажать **New +** → **Web Service**
2. Выбрать репозиторий **Khirad**
3. Настроить:
   - **Name**: `khirad-backend`
   - **Region**: Frankfurt (EU)
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npx prisma migrate deploy && npx prisma generate`
   - **Start Command**: `node src/index.js`
   - **Plan**: Free

### 2.3. Добавить Environment Variables

В разделе **Environment Variables** добавить:

| Key | Value | Откуда взять |
|-----|-------|-------------|
| `NODE_ENV` | `production` | — |
| `JWT_SECRET` | *(любая длинная строка)* | Сгенерировать: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `ENCRYPTION_KEY` | *(ровно 64 hex символа)* | Сгенерировать: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DATABASE_URL` | `file:./prod.db` | — |
| `GROQ_API_KEY` | `gsk_...` | https://console.groq.com/keys |
| `OPENROUTER_API_KEY` | `sk-or-...` | https://openrouter.ai/keys |
| `SERPER_API_KEY` | `...` | https://serper.dev/api-key |
| `FRONTEND_URL` | `https://podshoevbunyod16-sketch.github.io` | — |

4. Нажать **Create Web Service**
5. Дождаться деплоя (2-3 минуты)
6. **Скопировать URL** сервиса (например: `https://khirad-backend.onrender.com`)

### 2.4. Проверить работу

```bash
curl https://khirad-backend.onrender.com/api/health
# Должно вернуть: {"status":"ok","timestamp":"..."}
```

---

## Шаг 3: Деплой Frontend на GitHub Pages

### 3.1. Добавить Secret в GitHub

1. Перейти в репозиторий → **Settings** → **Secrets and variables** → **Actions**
2. Нажать **New repository secret**
3. Добавить:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://khirad-backend.onrender.com/api` *(URL бэкенда из шага 2.6)*

### 3.2. Включить GitHub Pages

1. **Settings** → **Pages**
2. **Source**: выбрать **GitHub Actions**
3. Сохранить

### 3.3. Запустить деплой

При пуше в `main` автоматически запустится GitHub Action. Или:

1. Перейти в **Actions** → **Deploy Frontend to GitHub Pages**
2. Нажать **Run workflow** → **Run workflow**

### 3.4. Проверить

Открыть: https://podshoevbunyod16-sketch.github.io/Khirad/

---

## Шаг 4: Обновить CORS в Render

Если фронтенд не может подключиться к бэкенду:

1. В Render Dashboard → ваш сервис → **Environment**
2. Убедиться что `FRONTEND_URL` = `https://podshoevbunyod16-sketch.github.io`
3. Сохранить — сервис перезапустится

---

## ⚠️ Важные моменты

### Render Free Tier
- Сервис **засыпает** через 15 минут неактивности
- Первый запрос после сна занимает **30-60 секунд** (cold start)
- 750 бесплатных часов в месяц

### Первый запуск
1. Открыть https://podshoevbunyod16-sketch.github.io/Khirad/
2. Зарегистрироваться (email/password)
3. В Settings → API Keys ввести ключи (или они уже есть из Render)
4. Начать чат!

### Обновление API ключей
API ключи можно менять двумя способами:
1. **Через UI**: Settings → API Keys (сохраняются в БД, зашифрованы AES-256)
2. **Через Render**: Environment Variables (для всего сервера)

---

## Обновление кода

```bash
# После изменений
git add .
git commit -m "Update"
git push

# Frontend обновится автоматически (GitHub Action)
# Backend обновится автоматически (Render auto-deploy)
```
