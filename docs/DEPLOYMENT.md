# Деплой на VPS

## Требования
- VPS с Ubuntu 22.04+
- Nginx
- Node.js 20+
- SSL сертификат (Let's Encrypt)

## Настройка VPS

### 1. Установка Nginx
```bash
sudo apt update
sudo apt install nginx
```

### 2. Конфигурация Nginx
```nginx
# /etc/nginx/sites-available/crm.poisk24na7.ru
server {
    listen 80;
    server_name crm.poisk24na7.ru;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name crm.poisk24na7.ru;

    ssl_certificate /etc/letsencrypt/live/crm.poisk24na7.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.poisk24na7.ru/privkey.pem;

    root /var/www/crm.poisk24na7.ru;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass https://mchhjqmgdhtzrpcevgdp.supabase.co;
    }
}
```

### 3. SSL сертификат
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d crm.poisk24na7.ru
```

## GitHub Secrets для автодеплоя
Добавь в Settings → Secrets → Actions:
- VPS_HOST: 62.113.37.2
- VPS_USER: root (или другой пользователь)
- VPS_SSH_KEY: приватный SSH ключ
- VITE_SUPABASE_URL: https://mchhjqmgdhtzrpcevgdp.supabase.co
- VITE_SUPABASE_ANON_KEY: твой anon key

## Ручной деплой
```bash
npm run build
scp -r dist/* user@62.113.37.2:/var/www/crm.poisk24na7.ru/
```

