# CRM DANIK-SERVIS Deployment Guide

## Структура окружений

### Production (Main Branch)
- **URL:** https://crm.poisk24na7.ru
- **Supabase Project ID:** mchhjqmgdhtzrpcevgdp
- **Database:** Production database
- **Deploy:** Автоматический деплой при merge в main

### Development (Develop Branch)
- **URL:** https://dev-crm.poisk24na7.ru (или localhost:5173)
- **Supabase Project ID:** fwefayqdxwfzzsswskoj
- **Database:** Development database
- **Deploy:** На локальной машине разработчика

---

## Локальная разработка

### Требования
- Node.js 18+
- npm или yarn
- Git

### Инициализация

```bash
# Клонируем репозиторий
git clone https://github.com/varibigrich12345-cmyk/crm-danik-servis.git
cd crm-danik-servis

# Переключаемся на develop ветку
git checkout develop

# Установка зависимостей
npm install
```

### Переменные окружения

Для локальной разработки создайте файл `.env.development.local`:

```env
# .env.development.local
VITE_SUPABASE_URL=https://fwefayqdxwfzzsswskoj.supabase.co
VITE_SUPABASE_ANON_KEY=<your-dev-anon-key>
VITE_APP_ENV=development
VITE_API_URL=http://localhost:5173
VITE_ENABLE_DEBUG_MODE=true
```

### Запуск в режиме разработки

```bash
npm run dev
```

Приложение будет доступно по адресу http://localhost:5173

---

## Git Workflow

### 1. Создание новой фичи

```bash
# Убедитесь что вы на develop ветке
git checkout develop

# Создайте новую ветку для фичи
git checkout -b feature/your-feature-name

# Работайте над фичей
# ...

# Коммитьте изменения
git add .
git commit -m "feat: add new feature"
```

### 2. Отправка в develop

```bash
# Отправьте ветку на GitHub
git push origin feature/your-feature-name

# Создайте Pull Request в develop ветку
# На GitHub: feature/your-feature-name -> develop
```

### 3. Merge в main (Production)

```bash
# Когда фича готова к продакшену:
# На GitHub: develop -> main
# После merge автоматически запускается деплой
```

---

## Деплой на VPS

### Конфигурация Nginx

Создайте файл `/etc/nginx/sites-available/crm-danik-servis`:

```nginx
server {
    listen 80;
    server_name crm.poisk24na7.ru;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name crm.poisk24na7.ru;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    root /var/www/crm-danik-servis/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Деплой скрипт

Создайте файл `/home/user/deploy.sh`:

```bash
#!/bin/bash

set -e  # Exit on error

echo "🚀 Starting deployment..."

cd /var/www/crm-danik-servis

# Получаем последние изменения
git fetch origin
git checkout main
git pull origin main

echo "📦 Installing dependencies..."
npm install --production

echo "🔨 Building application..."
npm run build

echo "🔄 Restarting nginx..."
sudo systemctl restart nginx

echo "✅ Deployment completed!"
```

Предоставьте права на выполнение:

```bash
chmod +x /home/user/deploy.sh
```

### GitHub Actions (CI/CD)

Создайте файл `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build
        env:
          VITE_SUPABASE_URL: ${{ secrets.PROD_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.PROD_SUPABASE_ANON_KEY }}
        run: npm run build

      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: /home/user/deploy.sh
```

### Настройка GitHub Secrets

Добавьте следующие secrets в GitHub репозиторий:

1. `PROD_SUPABASE_URL` - Production Supabase URL
2. `PROD_SUPABASE_ANON_KEY` - Production Supabase Anon Key
3. `VPS_HOST` - IP адрес VPS (62.113.37.2)
4. `VPS_USER` - Username для SSH (обычно root или user)
5. `VPS_SSH_KEY` - Приватный SSH ключ

---

## Мониторинг

### Проверка статуса приложения

```bash
# На VPS
curl https://crm.poisk24na7.ru/

# Проверка логов nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Откат к предыдущей версии

```bash
# На VPS
cd /var/www/crm-danik-servis
git log --oneline -10  # Посмотреть историю
git checkout <commit-hash>
npm run build
sudo systemctl restart nginx
```

---

## Команды

```bash
# Локальная разработка
npm run dev

# Build для production
npm run build

# Preview build
npm run preview

# Linting
npm run lint

# Type checking
npm run type-check
```

---

## Troubleshooting

### Проблема: Build fails

```bash
# Очистить кэш и переустановить
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Проблема: 404 on refresh

Убедитесь что в Nginx конфиге есть `try_files $uri $uri/ /index.html;`

### Проблема: Supabase connection error

Проверьте что переменные VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY установлены правильно.

---

## Контакты

Вопросы по деплойменту: varibigrich12345-cmyk@gmail.com
